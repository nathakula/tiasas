import { NextRequest, NextResponse } from "next/server";
import { getActiveOrgId } from "@/lib/org";
import { db as prisma } from "@/lib/db";
import {
  toCSV,
  toExcel,
  toJSON,
  formatExportDate,
  getExportFilename,
  getContentType,
  type ExportFormat,
} from "@tiasas/core/src/export";

/**
 * Export Journal entries in CSV, Excel, or JSON format
 * GET /api/export/journal?format=csv&startDate=2024-01-01&endDate=2024-12-31
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

    // Fetch journal entries
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        orgId,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        text: true,
        tags: true,
        isWinner: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Format data for export
    const exportData = journalEntries.map((entry) => ({
      Date: formatExportDate(entry.date),
      Entry: entry.text,
      Tags: entry.tags.join(", "),
      "Trade Result": entry.isWinner === true ? "Winner" : entry.isWinner === false ? "Loser" : "N/A",
      Author: entry.user.name || entry.user.email || "Unknown",
      "Created At": formatExportDate(entry.createdAt),
    }));

    // Generate export based on format
    let content: string | Buffer;
    let filename: string;

    switch (format) {
      case "csv":
        content = toCSV(exportData);
        filename = getExportFilename("journal", "csv");
        break;

      case "xlsx":
        content = toExcel(exportData, { sheetName: "Journal Entries" });
        filename = getExportFilename("journal", "xlsx");
        break;

      case "json":
        content = toJSON(exportData);
        filename = getExportFilename("journal", "json");
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
    console.error("Error exporting journal:", error);
    return NextResponse.json(
      { error: "Failed to export data", details: error.message },
      { status: 500 }
    );
  }
}
