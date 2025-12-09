import * as XLSX from "xlsx";

/**
 * Export utilities for converting data to various formats
 * Supports CSV, Excel, and JSON exports
 */

export type ExportFormat = "csv" | "xlsx" | "json";

/**
 * Convert array of objects to CSV string
 */
export function toCSV<T extends Record<string, any>>(
  data: T[],
  options?: {
    headers?: string[];
    delimiter?: string;
  }
): string {
  if (data.length === 0) return "";

  const delimiter = options?.delimiter || ",";
  const headers = options?.headers || Object.keys(data[0]);

  // Build CSV header row
  const headerRow = headers.map((h) => escapeCSVValue(h)).join(delimiter);

  // Build data rows
  const dataRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        return escapeCSVValue(value);
      })
      .join(delimiter);
  });

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) return "";

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert array of objects to Excel buffer
 */
export function toExcel<T extends Record<string, any>>(
  data: T[],
  options?: {
    sheetName?: string;
    headers?: string[];
  }
): Buffer {
  const sheetName = options?.sheetName || "Sheet1";
  const headers = options?.headers || (data.length > 0 ? Object.keys(data[0]) : []);

  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: headers,
  });

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Write to buffer
  const excelBuffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return Buffer.from(excelBuffer);
}

/**
 * Convert data to JSON string (pretty-printed)
 */
export function toJSON<T>(data: T): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Format date for export (YYYY-MM-DD)
 */
export function formatExportDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

/**
 * Format number for export (fixed decimal places)
 */
export function formatExportNumber(
  value: number | string,
  decimals: number = 2
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toFixed(decimals);
}

/**
 * Get filename with timestamp
 */
export function getExportFilename(
  prefix: string,
  format: ExportFormat,
  timestamp?: Date
): string {
  const ts = timestamp || new Date();
  const dateStr = ts.toISOString().split("T")[0];
  const timeStr = ts.toTimeString().split(" ")[0].replace(/:/g, "-");
  return `${prefix}_${dateStr}_${timeStr}.${format}`;
}

/**
 * Get content type for format
 */
export function getContentType(format: ExportFormat): string {
  switch (format) {
    case "csv":
      return "text/csv";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "json":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}
