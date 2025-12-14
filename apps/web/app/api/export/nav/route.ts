import { NextRequest, NextResponse } from "next/server";
import { getActiveOrgId } from "@/lib/org";
import { db as prisma } from "@/lib/db";
import {
  toCSV,
  toExcel,
  toJSON,
  formatExportDate,
  formatExportNumber,
  getExportFilename,
  getContentType,
  type ExportFormat,
} from "@tiasas/core/src/export";

/**
 * Export Monthly NAV data in CSV, Excel, or JSON format
 * GET /api/export/nav?format=csv&startDate=2024-01&endDate=2024-12
 */
export async function GET(req: NextRequest) {
  try {
    const orgId = await getActiveOrgId();
    if (!orgId) {
      return NextResponse.json({ error: "No active organization" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const format = (searchParams.get("format") || "csv") as ExportFormat;
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    // Validate format
    if (!["csv", "xlsx", "json"].includes(format)) {
      return NextResponse.json({ error: "Invalid format. Use csv, xlsx, or json." }, { status: 400 });
    }

    // Build date filter
    const dateFilter: any = {};
    if (startDateStr) {
      dateFilter.gte = new Date(startDateStr);
    }
    if (endDateStr) {
      dateFilter.lte = new Date(endDateStr);
    }

    // Fetch monthly NAV data
    const navRecords = await prisma.dailyPnl.findMany({
      where: {
        orgId,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        // Only include records with NAV data
        NOT: {
          totalEquity: null,
        },
      },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        totalEquity: true,
        note: true,
      },
    });

    // Group by month and get the last entry (month-end) for each month
    const monthlyNavMap = new Map<string, typeof navRecords[0]>();

    navRecords.forEach((record) => {
      const monthKey = record.date.toISOString().substring(0, 7); // YYYY-MM
      const existing = monthlyNavMap.get(monthKey);

      // Keep the latest date for each month (month-end NAV)
      if (!existing || record.date > existing.date) {
        monthlyNavMap.set(monthKey, record);
      }
    });

    // Convert to array and format for export
    const exportData = Array.from(monthlyNavMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, record]) => ({
        Month: month,
        "Month-End Date": formatExportDate(record.date),
        "NAV (Total Equity)": formatExportNumber(Number(record.totalEquity)),
        Note: record.note || "",
      }));

    // Generate export based on format
    let content: string | Buffer;
    let filename: string;

    switch (format) {
      case "csv":
        content = toCSV(exportData);
        filename = getExportFilename("monthly-nav", "csv");
        break;

      case "xlsx":
        content = toExcel(exportData, { sheetName: "Monthly NAV" });
        filename = getExportFilename("monthly-nav", "xlsx");
        break;

      case "json":
        content = toJSON(exportData);
        filename = getExportFilename("monthly-nav", "json");
        break;

      default:
        return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
    }

    // Return file download response
    return new NextResponse(content as any, {
      status: 200,
      headers: {
        "Content-Type": getContentType(format),
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Error exporting monthly NAV:", error);
    return NextResponse.json(
      { error: "Failed to export data", details: error.message },
      { status: 500 }
    );
  }
}
