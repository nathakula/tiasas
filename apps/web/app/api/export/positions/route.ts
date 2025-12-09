import { NextRequest, NextResponse } from "next/server";
import { getActiveOrgId } from "@/lib/org";
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
import { getAggregatedPositions } from "@tiasas/core/src/brokerbridge";

/**
 * Export current positions in CSV, Excel, or JSON format
 * GET /api/export/positions?format=csv
 */
export async function GET(req: NextRequest) {
  try {
    const orgId = await getActiveOrgId();
    if (!orgId) {
      return NextResponse.json({ error: "No active organization" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const format = (searchParams.get("format") || "csv") as ExportFormat;

    // Validate format
    if (!["csv", "xlsx", "json"].includes(format)) {
      return NextResponse.json({ error: "Invalid format. Use csv, xlsx, or json." }, { status: 400 });
    }

    // Use the same aggregation logic as the UI to get all positions
    const positions = await getAggregatedPositions({ orgId });

    // Format data for export
    const exportData = positions.map((pos) => {
      const unrealizedPnlPercent =
        pos.totalCostBasis !== 0
          ? (pos.totalUnrealizedPL / pos.totalCostBasis) * 100
          : 0;

      // Get unique brokers and accounts for this position
      const uniqueBrokers = Array.from(
        new Set(pos.accounts.map((acc) => acc.brokerSource || acc.broker))
      );
      const brokerDisplay =
        uniqueBrokers.length === 1
          ? uniqueBrokers[0]
          : uniqueBrokers.length > 1
            ? `${uniqueBrokers.length} brokers`
            : "Unknown";

      const accountsDisplay =
        pos.accounts.length === 1
          ? pos.accounts[0].accountNickname || pos.accounts[0].accountId
          : `${pos.accounts.length} accounts`;

      return {
        Symbol: pos.instrument.symbol,
        "Asset Class": pos.instrument.assetClass,
        Quantity: formatExportNumber(pos.totalQuantity, 4),
        "Average Price": formatExportNumber(pos.weightedAveragePrice),
        "Cost Basis": formatExportNumber(pos.totalCostBasis),
        "Market Value": formatExportNumber(pos.totalMarketValue),
        "Unrealized P&L": formatExportNumber(pos.totalUnrealizedPL),
        "Unrealized P&L %": formatExportNumber(unrealizedPnlPercent),
        Broker: brokerDisplay,
        Accounts: accountsDisplay,
        "Basis Method": pos.accounts[0]?.averagePrice ? "Average Cost" : "Unknown",
      };
    });

    // Generate export based on format
    let content: string | Buffer;
    let filename: string;

    switch (format) {
      case "csv":
        content = toCSV(exportData);
        filename = getExportFilename("positions", "csv");
        break;

      case "xlsx":
        content = toExcel(exportData, { sheetName: "Positions" });
        filename = getExportFilename("positions", "xlsx");
        break;

      case "json":
        content = toJSON(exportData);
        filename = getExportFilename("positions", "json");
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
    console.error("Error exporting positions:", error);
    return NextResponse.json(
      { error: "Failed to export data", details: error.message },
      { status: 500 }
    );
  }
}
