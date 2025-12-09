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
 * Export Daily P&L data in CSV, Excel, or JSON format
 * GET /api/export/daily-pnl?format=csv&startDate=2024-01-01&endDate=2024-12-31
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

    // Fetch daily P&L data
    const dailyPnlRecords = await prisma.dailyPnl.findMany({
      where: {
        orgId,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        realizedPnl: true,
        unrealizedPnl: true,
        totalEquity: true,
        note: true,
      },
    });

    // Format data for export
    const exportData = dailyPnlRecords.map((record) => ({
      Date: formatExportDate(record.date),
      "Realized P&L": formatExportNumber(Number(record.realizedPnl)),
      "Unrealized P&L": formatExportNumber(Number(record.unrealizedPnl)),
      "Total Equity": record.totalEquity ? formatExportNumber(Number(record.totalEquity)) : "",
      Note: record.note || "",
    }));

    // Generate export based on format
    let content: string | Buffer;
    let filename: string;

    switch (format) {
      case "csv":
        content = toCSV(exportData);
        filename = getExportFilename("daily-pnl", "csv");
        break;

      case "xlsx":
        content = toExcel(exportData, { sheetName: "Daily P&L" });
        filename = getExportFilename("daily-pnl", "xlsx");
        break;

      case "json":
        content = toJSON(exportData);
        filename = getExportFilename("daily-pnl", "json");
        break;

      default:
        return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
    }

    // Return file download response
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": getContentType(format),
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Error exporting daily P&L:", error);
    return NextResponse.json(
      { error: "Failed to export data", details: error.message },
      { status: 500 }
    );
  }
}
