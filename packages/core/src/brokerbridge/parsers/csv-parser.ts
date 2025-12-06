/**
 * CSV Parser Utilities
 * Handles parsing CSV files and intelligent column detection
 */

import type { CSVColumnMapping } from "../types";

export type ParsedCSV = {
  headers: string[];
  rows: Array<Record<string, string>>;
  accountSummary?: {
    accountName?: string;
    netAccountValue?: number;
    totalGain?: number;
    totalGainPercent?: number;
  };
};

/**
 * Detect if a line looks like a position data header
 */
function looksLikePositionHeader(line: string): boolean {
  const lower = line.toLowerCase();
  // Must contain "symbol" or "ticker" AND at least one quantity/value indicator
  const hasSymbol = /symbol|ticker|stock|security/i.test(lower);
  const hasQuantity = /quantity|qty|shares|position|units/i.test(lower);
  const hasValue = /value|price|cost|basis/i.test(lower);
  return hasSymbol && (hasQuantity || hasValue);
}

/**
 * Detect if a line looks like metadata/summary (not position data)
 */
function looksLikeMetadata(line: string): boolean {
  const lower = line.toLowerCase();
  // Common broker metadata patterns
  return (
    /^account\s*(summary|info|details)/i.test(lower) ||
    /^view\s*summary/i.test(lower) ||
    /^filters?\s*applied/i.test(lower) ||
    /^(generated|downloaded|exported)\s*(at|on)/i.test(lower) ||
    /^sort\s*(by|order)/i.test(lower) ||
    // Empty or nearly empty lines with just commas
    /^[,\s]*$/.test(line)
  );
}

/**
 * Extract account summary data from multi-section broker CSVs
 */
function extractAccountSummary(lines: string[]): ParsedCSV["accountSummary"] {
  // Look for "Account Summary" section followed by header and data
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    if (/^account\s*summary/i.test(line)) {
      // Next line should be headers
      const headerLine = lines[i + 1];
      const dataLine = lines[i + 2];
      if (!headerLine || !dataLine) continue;

      const headers = parseCSVLine(headerLine).map(h => h.toLowerCase());
      const values = parseCSVLine(dataLine);

      const summary: NonNullable<ParsedCSV["accountSummary"]> = {};

      // Map common account summary fields
      const accountIdx = headers.findIndex(h => h === "account");
      const navIdx = headers.findIndex(h => /net\s*account\s*value/i.test(h));
      const gainIdx = headers.findIndex(h => /total\s*gain\s*\$/i.test(h));
      const gainPctIdx = headers.findIndex(h => /total\s*gain\s*%/i.test(h));

      if (accountIdx >= 0) summary.accountName = values[accountIdx];
      if (navIdx >= 0) {
        const val = values[navIdx]?.replace(/[,$]/g, "");
        if (val) summary.netAccountValue = parseFloat(val);
      }
      if (gainIdx >= 0) {
        const val = values[gainIdx]?.replace(/[,$]/g, "");
        if (val) summary.totalGain = parseFloat(val);
      }
      if (gainPctIdx >= 0) {
        const val = values[gainPctIdx]?.replace(/[,%]/g, "");
        if (val) summary.totalGainPercent = parseFloat(val);
      }

      return Object.keys(summary).length > 0 ? summary : undefined;
    }
  }
  return undefined;
}

/**
 * Parse CSV content into structured data
 * Enhanced to handle multi-section broker exports (E*TRADE, etc.)
 */
export function parseCSVContent(content: string): ParsedCSV {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Extract account summary if present
  const accountSummary = extractAccountSummary(lines);

  // Find the position data section
  let headerLineIdx = -1;
  let dataStartIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip known metadata lines
    if (looksLikeMetadata(line)) continue;

    // Check if this looks like a position header
    if (looksLikePositionHeader(line)) {
      headerLineIdx = i;
      dataStartIdx = i + 1;
      break;
    }
  }

  // Fallback: if no clear position header found, assume first non-metadata line is header
  if (headerLineIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (!looksLikeMetadata(lines[i])) {
        headerLineIdx = i;
        dataStartIdx = i + 1;
        break;
      }
    }
  }

  if (headerLineIdx === -1 || dataStartIdx >= lines.length) {
    return { headers: [], rows: [], accountSummary };
  }

  // Parse headers
  const headers = parseCSVLine(lines[headerLineIdx]);

  // Parse data rows
  const rows: Array<Record<string, string>> = [];
  for (let i = dataStartIdx; i < lines.length; i++) {
    const line = lines[i];

    // Stop at common footer patterns
    if (/^(total|margin\s*debit|generated\s*at)/i.test(line)) {
      break;
    }

    const values = parseCSVLine(line);
    if (values.length === 0) continue;

    // Skip rows that don't have enough fields
    if (values.length < Math.max(2, headers.length / 2)) continue;

    // Create object mapping headers to values
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || "";
    }
    rows.push(row);
  }

  return { headers, rows, accountSummary };
}

/**
 * Parse a single CSV line, handling quoted values and commas
 */
export function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Handle escaped quotes ("")
      if (inQuotes && line[i + 1] === '"') {
        currentValue += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // End of field
      values.push(currentValue.trim());
      currentValue = "";
    } else {
      currentValue += char;
    }
  }

  // Add last value
  values.push(currentValue.trim());

  return values;
}

/**
 * Intelligent column mapping inference
 * Attempts to detect standard column names and variations
 */
export function inferColumnMapping(headers: string[]): CSVColumnMapping | null {
  const normalized = headers.map((h) => h.toLowerCase().trim());

  // Define pattern matchers for each field
  const patterns: Record<keyof CSVColumnMapping, RegExp[]> = {
    symbol: [/^symbol$/i, /^ticker$/i, /^stock$/i, /^instrument$/i, /^security$/i],
    quantity: [
      /^quantity$/i,
      /^qty$/i,
      /^qty\s*#$/i, // E*TRADE format
      /^shares$/i,
      /^amount$/i,
      /^position$/i,
      /^units$/i,
    ],
    averagePrice: [
      /^(average|avg)[\s_-]?(price|cost)$/i,
      /^average[\s_-]?cost[\s_-]?basis$/i, // Fidelity format: "Average Cost Basis"
      /^cost[\s_-]?basis[\s_-]?per[\s_-]?share$/i,
      /^price[\s_-]?paid$/i,
      /^price[\s_-]?paid[\s_-]?\$$/i, // E*TRADE format
    ],
    costBasis: [
      /^cost[\s_-]?basis$/i,
      /^cost[\s_-]?basis[\s_-]?total$/i, // Fidelity format: "Cost Basis Total"
      /^total[\s_-]?cost[\s_-]?basis$/i,
      /^total[\s_-]?cost$/i,
      /^book[\s_-]?value$/i,
      /^basis$/i,
    ],
    lastPrice: [
      /^(last|current|market)[\s_-]?price$/i,
      /^last[\s_-]?price[\s_-]?\$$/i, // E*TRADE format
      /^last[\s_-]?trade$/i,
      /^quote$/i,
      /^price$/i,
    ],
    marketValue: [
      /^market[\s_-]?value$/i,
      /^current[\s_-]?value$/i,
      /^total[\s_-]?value$/i,
      /^value$/i,
      /^value[\s_-]?\$$/i, // E*TRADE format
    ],
    unrealizedPL: [
      /^unrealized[\s_-]?(p[\s_-]?l|gain|loss|pnl)$/i,
      /^total[\s_-]?gain[\s_-]?\$$/i, // E*TRADE format: "Total Gain $"
      /^total[\s_-]?gain[\s/]?loss[\s_-]?(dollar|\$)$/i, // Fidelity format: "Total Gain/Loss Dollar"
      /^total[\s_-]?gain$/i,
      /^gain[\s_-]?loss[\s_-]?\$$/i,
      /^p[\s_-]?l$/i,
      /^pnl$/i,
    ],
    accountNickname: [
      /^account[\s_-]?name$/i, // Fidelity format: "Account Name" - prioritized first
      /^account[\s_-]?nickname$/i,
      /^sub[\s_-]?account$/i,
      /^account$/i,
      // NOTE: "Account Number" intentionally excluded to prioritize friendly names
      // Account numbers will be stored separately in broker account metadata
    ],
    assetClass: [
      /^asset[\s_-]?class$/i,
      /^type$/i,
      /^security[\s_-]?type$/i,
      /^security[\s_-]?type\(s\)$/i, // E*TRADE format
      /^instrument[\s_-]?type$/i,
    ],
    currency: [/^currency$/i, /^ccy$/i, /^curr$/i],
  };

  const mapping: Partial<CSVColumnMapping> = {};

  // Try to find each required field
  for (const [field, regexes] of Object.entries(patterns)) {
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const normalizedHeader = normalized[i];

      // Check if header matches any pattern
      if (regexes.some((regex) => regex.test(normalizedHeader))) {
        mapping[field as keyof CSVColumnMapping] = header;
        break;
      }
    }
  }

  // Validate that we found at least symbol and quantity (required fields)
  if (!mapping.symbol || !mapping.quantity) {
    return null;
  }

  return mapping as CSVColumnMapping;
}

/**
 * Validate a CSV row has required fields
 */
export function validateCSVRow(
  row: Record<string, string>,
  mapping: CSVColumnMapping
): { valid: boolean; error?: string } {
  // Check required fields
  if (!row[mapping.symbol]?.trim()) {
    return { valid: false, error: "Symbol is required" };
  }

  const quantity = row[mapping.quantity]?.trim();
  if (!quantity) {
    return { valid: false, error: "Quantity is required" };
  }

  // Validate quantity is a number
  const qtyNum = parseFloat(quantity.replace(/[,$]/g, ""));
  if (isNaN(qtyNum)) {
    return { valid: false, error: "Quantity must be a valid number" };
  }

  // Validate optional numeric fields if present
  const numericFields: Array<keyof CSVColumnMapping> = [
    "averagePrice",
    "costBasis",
    "lastPrice",
    "marketValue",
  ];

  for (const field of numericFields) {
    const fieldName = mapping[field];
    if (fieldName) {
      const value = row[fieldName]?.trim();
      if (value) {
        const num = parseFloat(value.replace(/[,$]/g, ""));
        if (isNaN(num)) {
          return { valid: false, error: `${field} must be a valid number` };
        }
      }
    }
  }

  return { valid: true };
}

/**
 * Format CSV column mapping for display
 */
export function formatColumnMapping(mapping: CSVColumnMapping): string {
  const entries = Object.entries(mapping)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}: "${value}"`)
    .join(", ");
  return `{ ${entries} }`;
}

/**
 * Get suggested column mappings for a set of headers
 */
export function getSuggestedMappings(headers: string[]): {
  auto: CSVColumnMapping | null;
  manual: Array<{ field: keyof CSVColumnMapping; label: string; required: boolean }>;
} {
  const auto = inferColumnMapping(headers);

  const manual: Array<{ field: keyof CSVColumnMapping; label: string; required: boolean }> = [
    { field: "symbol", label: "Symbol/Ticker", required: true },
    { field: "quantity", label: "Quantity", required: true },
    { field: "averagePrice", label: "Average Price", required: false },
    { field: "costBasis", label: "Cost Basis", required: false },
    { field: "lastPrice", label: "Last Price", required: false },
    { field: "marketValue", label: "Market Value", required: false },
    { field: "unrealizedPL", label: "Unrealized P&L / Total Gain", required: false },
    { field: "accountNickname", label: "Account Name/Nickname", required: false },
    { field: "assetClass", label: "Asset Class", required: false },
    { field: "currency", label: "Currency", required: false },
  ];

  return { auto, manual };
}

/**
 * Parse option symbol to extract underlying, expiry, strike, and type
 * Handles formats like:
 * - "AAPL Nov 14 '25 $585 Put"
 * - "META Nov 21 '25 $650 Call"
 */
export function parseOptionSymbol(symbol: string): {
  underlying: string;
  expiry?: string; // ISO date string
  strike?: number;
  optionType?: "CALL" | "PUT";
} | null {
  // Pattern: SYMBOL Month Day 'YY $Strike Call/Put
  const optionPattern = /^([A-Z]+)\s+([A-Za-z]+)\s+(\d{1,2})\s+'(\d{2})\s+\$(\d+(?:\.\d+)?)\s+(Call|Put)$/i;
  const match = symbol.match(optionPattern);

  if (!match) {
    return null;
  }

  const [, underlying, monthName, day, year, strikeStr, optionType] = match;

  // Parse month name to number
  const monthMap: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
  };

  const month = monthMap[monthName.toLowerCase()];
  if (!month) return null;

  // Construct full year (assume 20XX)
  const fullYear = 2000 + parseInt(year, 10);

  // Create ISO date string
  const expiry = `${fullYear}-${month.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;

  return {
    underlying,
    expiry,
    strike: parseFloat(strikeStr),
    optionType: optionType.toUpperCase() as "CALL" | "PUT",
  };
}
