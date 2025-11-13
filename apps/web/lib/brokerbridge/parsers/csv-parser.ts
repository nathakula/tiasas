/**
 * CSV Parser Utilities
 * Handles parsing CSV files and intelligent column detection
 */

import type { CSVColumnMapping } from "../types";

export type ParsedCSV = {
  headers: string[];
  rows: Array<Record<string, string>>;
};

/**
 * Parse CSV content into structured data
 */
export function parseCSVContent(content: string): ParsedCSV {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse first line as headers
  const headers = parseCSVLine(lines[0]);

  // Parse remaining lines as data rows
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    // Create object mapping headers to values
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || "";
    }
    rows.push(row);
  }

  return { headers, rows };
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
      /^shares$/i,
      /^amount$/i,
      /^position$/i,
      /^units$/i,
    ],
    averagePrice: [
      /^(average|avg)[\s_-]?(price|cost)$/i,
      /^cost[\s_-]?basis[\s_-]?per[\s_-]?share$/i,
      /^price[\s_-]?paid$/i,
    ],
    costBasis: [
      /^cost[\s_-]?basis$/i,
      /^total[\s_-]?cost$/i,
      /^book[\s_-]?value$/i,
      /^basis$/i,
    ],
    lastPrice: [
      /^(last|current|market)[\s_-]?price$/i,
      /^last[\s_-]?trade$/i,
      /^quote$/i,
      /^price$/i,
    ],
    marketValue: [
      /^market[\s_-]?value$/i,
      /^current[\s_-]?value$/i,
      /^total[\s_-]?value$/i,
      /^value$/i,
    ],
    assetClass: [
      /^asset[\s_-]?class$/i,
      /^type$/i,
      /^security[\s_-]?type$/i,
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
    { field: "assetClass", label: "Asset Class", required: false },
    { field: "currency", label: "Currency", required: false },
  ];

  return { auto, manual };
}
