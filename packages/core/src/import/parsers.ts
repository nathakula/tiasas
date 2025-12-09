import * as XLSX from "xlsx";

/**
 * Import parsers for converting various file formats to CSV format
 * Supports CSV, Excel (.xlsx), and JSON
 */

export type ImportFormat = "csv" | "xlsx" | "json";

/**
 * Parse uploaded file based on its format and convert to CSV string
 */
export function parseImportFile(
  file: File,
  format: ImportFormat
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (!content) {
          reject(new Error("Failed to read file"));
          return;
        }

        let csvText: string;

        switch (format) {
          case "csv":
            csvText = content as string;
            break;

          case "xlsx":
            csvText = parseExcelToCSV(content as ArrayBuffer);
            break;

          case "json":
            csvText = parseJSONToCSV(content as string);
            break;

          default:
            reject(new Error(`Unsupported format: ${format}`));
            return;
        }

        resolve(csvText);
      } catch (error: any) {
        reject(new Error(`Failed to parse ${format} file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    // Read based on format
    if (format === "xlsx") {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  });
}

/**
 * Parse Excel file and convert first sheet to CSV
 */
function parseExcelToCSV(arrayBuffer: ArrayBuffer): string {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  // Get first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Excel file has no sheets");
  }

  const worksheet = workbook.Sheets[sheetName];

  // Convert to CSV
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  return csv;
}

/**
 * Parse JSON file and convert to CSV
 * Expects an array of objects with consistent keys
 */
function parseJSONToCSV(jsonString: string): string {
  const data = JSON.parse(jsonString);

  if (!Array.isArray(data)) {
    throw new Error("JSON must be an array of objects");
  }

  if (data.length === 0) {
    throw new Error("JSON array is empty");
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);

  // Build CSV header row
  const headerRow = headers.join(",");

  // Build data rows
  const dataRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        // Handle values that need quoting (commas, quotes, newlines)
        if (value === null || value === undefined) return "";
        const stringValue = String(value);
        if (
          stringValue.includes(",") ||
          stringValue.includes('"') ||
          stringValue.includes("\n")
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(",");
  });

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Detect file format from file extension
 */
export function detectFileFormat(filename: string): ImportFormat | null {
  const extension = filename.toLowerCase().split(".").pop();

  switch (extension) {
    case "csv":
      return "csv";
    case "xlsx":
    case "xls":
      return "xlsx";
    case "json":
      return "json";
    default:
      return null;
  }
}
