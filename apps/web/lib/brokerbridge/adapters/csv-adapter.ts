/**
 * CSV Import Adapter
 * Handles importing positions from CSV files
 */

import { BrokerProvider } from "@prisma/client";
import type {
  BrokerAdapter,
  BrokerAuthInput,
  BrokerAccount,
  RawPositionPayload,
  CashPayload,
  CSVColumnMapping,
} from "../types";
import { AdapterError } from "../types";
import { parseCSVContent, inferColumnMapping, validateCSVRow } from "../parsers/csv-parser";

export type CSVImportAuthInput = {
  fileContent: string;
  fileName: string;
  accountNickname?: string;
  columnMapping?: CSVColumnMapping;
  asOf?: Date;
};

export class CSVAdapter implements BrokerAdapter {
  private fileContent: string | null = null;
  private fileName: string | null = null;
  private columnMapping: CSVColumnMapping | null = null;
  private asOf: Date | null = null;
  private accountNickname: string | null = null;

  /**
   * "Connect" by storing CSV file content and configuration
   */
  async connect(authInput: BrokerAuthInput): Promise<{ connectionId: string }> {
    const csvAuth = authInput as CSVImportAuthInput;

    if (!csvAuth.fileContent) {
      throw AdapterError.authFailed("CSV file content is required");
    }

    if (!csvAuth.fileName) {
      throw AdapterError.authFailed("CSV file name is required");
    }

    // Store configuration
    this.fileContent = csvAuth.fileContent;
    this.fileName = csvAuth.fileName;
    this.asOf = csvAuth.asOf || new Date();
    this.accountNickname = csvAuth.accountNickname || csvAuth.fileName.replace(/\.csv$/i, "");

    // Parse CSV to validate structure
    const parsed = parseCSVContent(csvAuth.fileContent);
    if (parsed.rows.length === 0) {
      throw AdapterError.parseError("CSV file contains no data rows");
    }

    // Infer or validate column mapping
    if (csvAuth.columnMapping) {
      this.columnMapping = csvAuth.columnMapping;
    } else {
      // Attempt to infer column mapping from headers
      const inferred = inferColumnMapping(parsed.headers);
      if (!inferred) {
        throw AdapterError.parseError(
          "Unable to automatically detect CSV columns. Please provide explicit column mapping.",
          { headers: parsed.headers }
        );
      }
      this.columnMapping = inferred;
    }

    // Generate synthetic connection ID
    const connectionId = `csv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    return { connectionId };
  }

  /**
   * Return a single synthetic account for the CSV file
   */
  async listAccounts(connectionId: string): Promise<BrokerAccount[]> {
    if (!this.fileName) {
      throw AdapterError.invalidAccount("CSV adapter not initialized");
    }

    const accountId = `csv_account_${connectionId}`;
    return [
      {
        accountId,
        nickname: this.accountNickname || this.fileName,
        maskedNumber: undefined,
        accountType: "CSV_IMPORT",
      },
    ];
  }

  /**
   * Parse CSV and return raw positions
   */
  async fetchPositions(accountId: string): Promise<RawPositionPayload> {
    if (!this.fileContent || !this.columnMapping) {
      throw AdapterError.invalidAccount("CSV adapter not initialized");
    }

    const parsed = parseCSVContent(this.fileContent);
    const positions: unknown[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    // Transform each CSV row into a position object
    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const rowNum = i + 2; // +1 for 0-index, +1 for header row

      try {
        // Validate row has required fields
        const validation = validateCSVRow(row, this.columnMapping);
        if (!validation.valid) {
          errors.push({ row: rowNum, message: validation.error || "Invalid row" });
          continue;
        }

        // Map CSV row to position object
        const position = this.mapRowToPosition(row, this.columnMapping);
        positions.push(position);
      } catch (error) {
        errors.push({
          row: rowNum,
          message: error instanceof Error ? error.message : "Unknown parsing error",
        });
      }
    }

    if (positions.length === 0 && errors.length > 0) {
      throw AdapterError.parseError("Failed to parse any positions from CSV", { errors });
    }

    return {
      positions,
      cash: 0, // CSV typically doesn't include cash balance
      metadata: {
        fileName: this.fileName,
        asOf: this.asOf?.toISOString(),
        rowCount: parsed.rows.length,
        successCount: positions.length,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  }

  /**
   * CSV imports typically don't include cash balances
   */
  async fetchCash(accountId: string): Promise<CashPayload> {
    return {
      total: 0,
      currency: "USD",
      breakdown: [
        {
          type: "CASH",
          amount: 0,
        },
      ],
    };
  }

  /**
   * Test connection by validating CSV structure
   */
  async testConnection(connectionId: string): Promise<boolean> {
    return this.fileContent !== null && this.columnMapping !== null;
  }

  /**
   * Map a single CSV row to a position object
   */
  private mapRowToPosition(row: Record<string, string>, mapping: CSVColumnMapping): unknown {
    const getField = (field: string | undefined): string | undefined => {
      if (!field) return undefined;
      return row[field]?.trim() || undefined;
    };

    const getNumber = (field: string | undefined): number | undefined => {
      const value = getField(field);
      if (!value) return undefined;
      const num = parseFloat(value.replace(/[,$]/g, ""));
      return isNaN(num) ? undefined : num;
    };

    const symbol = getField(mapping.symbol);
    if (!symbol) {
      throw new Error("Symbol is required");
    }

    const quantity = getNumber(mapping.quantity);
    if (quantity === undefined) {
      throw new Error("Quantity is required");
    }

    return {
      symbol,
      quantity,
      averagePrice: getNumber(mapping.averagePrice),
      costBasis: getNumber(mapping.costBasis),
      lastPrice: getNumber(mapping.lastPrice),
      marketValue: getNumber(mapping.marketValue),
      assetClass: getField(mapping.assetClass),
      currency: getField(mapping.currency) || "USD",
      // Pass through all other fields as metadata
      metadata: row,
    };
  }
}

/**
 * Factory function for creating CSV adapter instances
 */
export function createCSVAdapter(): CSVAdapter {
  return new CSVAdapter();
}
