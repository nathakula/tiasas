"use client";

import { useState } from "react";
import { Download, FileText, Table, FileJson, Loader2 } from "lucide-react";

type ExportFormat = "csv" | "xlsx" | "json";

interface ExportButtonProps {
  /** API endpoint to call for export (e.g., "/api/export/daily-pnl") */
  endpoint: string;
  /** Optional date range filter */
  dateRange?: {
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
  };
  /** Button label (default: "Export") */
  label?: string;
  /** Button variant */
  variant?: "primary" | "secondary" | "ghost";
  /** Show format selector dropdown */
  showFormatSelector?: boolean;
}

export function ExportButton({
  endpoint,
  dateRange,
  label = "Export",
  variant = "secondary",
  showFormatSelector = true,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  async function handleExport(format: ExportFormat) {
    try {
      setIsExporting(true);
      setShowMenu(false);

      // Build query params
      const params = new URLSearchParams({ format });
      if (dateRange?.startDate) {
        params.append("startDate", dateRange.startDate);
      }
      if (dateRange?.endDate) {
        params.append("endDate", dateRange.endDate);
      }

      // Call export endpoint
      const response = await fetch(`${endpoint}?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `export.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  const buttonClass = `
    inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
    ${
      variant === "primary"
        ? "bg-gold-500 text-white hover:bg-gold-600"
        : variant === "secondary"
        ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600"
        : "bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
    }
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  if (!showFormatSelector) {
    return (
      <button
        onClick={() => handleExport("csv")}
        disabled={isExporting}
        className={buttonClass}
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {label}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className={buttonClass}
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {label}
      </button>

      {showMenu && !isExporting && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg z-20 overflow-hidden">
            <button
              onClick={() => handleExport("csv")}
              className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-900 dark:text-slate-100 transition-colors"
            >
              <FileText className="w-4 h-4 text-emerald-500" />
              Export as CSV
            </button>
            <button
              onClick={() => handleExport("xlsx")}
              className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-900 dark:text-slate-100 transition-colors"
            >
              <Table className="w-4 h-4 text-blue-500" />
              Export as Excel
            </button>
            <button
              onClick={() => handleExport("json")}
              className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-900 dark:text-slate-100 transition-colors"
            >
              <FileJson className="w-4 h-4 text-purple-500" />
              Export as JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}
