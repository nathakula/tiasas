/**
 * API Route: /api/brokerbridge/import/preview
 * Preview positions that will be imported from CSV/OFX file
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseCSVContent, inferColumnMapping } from "@tiasas/core/src/brokerbridge/parsers/csv-parser";
import { parseInstrument } from "@tiasas/core/src/brokerbridge/symbol-utils";
import { detectBrokerFromCSV, getBrokerDisplayName } from "@tiasas/core/src/brokerbridge/parsers/broker-detector";

/**
 * POST /api/brokerbridge/import/preview
 * Parse and preview positions from file without importing
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fileContent, fileName, fileType, columnMapping } = body;

    if (!fileContent || !fileName || !fileType) {
      return NextResponse.json(
        { error: "Missing required fields: fileContent, fileName, fileType" },
        { status: 400 }
      );
    }

    if (fileType !== "CSV") {
      return NextResponse.json(
        { error: "Only CSV preview is currently supported" },
        { status: 400 }
      );
    }

    // Parse CSV content
    const parsed = parseCSVContent(fileContent);

    if (parsed.rows.length === 0) {
      return NextResponse.json(
        { error: "No data rows found in CSV file" },
        { status: 400 }
      );
    }

    // Detect broker from CSV structure
    const detectedBroker = detectBrokerFromCSV(parsed.headers, parsed.rows[0]);

    // Infer or use provided column mapping
    const mapping = columnMapping || inferColumnMapping(parsed.headers);

    if (!mapping) {
      return NextResponse.json(
        {
          error: "Unable to automatically detect CSV columns",
          headers: parsed.headers,
          suggestion: "Please provide explicit column mapping",
        },
        { status: 400 }
      );
    }

    // Preview positions
    const positions: any[] = [];
    const errors: Array<{ row: number; symbol: string; error: string }> = [];

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const rowNum = i + 1;

      try {
        // Extract fields using column mapping
        const symbol = row[mapping.symbol]?.trim();
        const quantityStr = row[mapping.quantity]?.trim().replace(/[,$]/g, "");
        const avgPriceStr = mapping.averagePrice ? row[mapping.averagePrice]?.trim().replace(/[,$]/g, "") : undefined;
        const costBasisStr = mapping.costBasis ? row[mapping.costBasis]?.trim().replace(/[,$]/g, "") : undefined;
        const lastPriceStr = mapping.lastPrice ? row[mapping.lastPrice]?.trim().replace(/[,$]/g, "") : undefined;
        const marketValueStr = mapping.marketValue ? row[mapping.marketValue]?.trim().replace(/[,$]/g, "") : undefined;

        // Validate required fields
        if (!symbol) {
          errors.push({ row: rowNum, symbol: symbol || "Unknown", error: "Symbol is required" });
          continue;
        }

        if (!quantityStr || isNaN(Number(quantityStr))) {
          errors.push({ row: rowNum, symbol, error: `Invalid quantity: "${quantityStr}"` });
          continue;
        }

        const quantity = parseFloat(quantityStr);
        const costBasisValue = costBasisStr && !isNaN(Number(costBasisStr)) ? parseFloat(costBasisStr) : undefined;
        let averagePrice = avgPriceStr && !isNaN(Number(avgPriceStr)) ? parseFloat(avgPriceStr) : undefined;

        // Calculate average price from cost basis if not provided (Fidelity uses costBasis instead of avgPrice)
        if (!averagePrice && costBasisValue && quantity !== 0) {
          averagePrice = costBasisValue / Math.abs(quantity);
        }

        const lastPrice = lastPriceStr && !isNaN(Number(lastPriceStr)) ? parseFloat(lastPriceStr) : undefined;
        const marketValue = marketValueStr && !isNaN(Number(marketValueStr)) ? parseFloat(marketValueStr) : undefined;

        // Parse instrument info (detects options, ETFs, etc.)
        const instrument = parseInstrument(symbol, "ETRADE", row);

        // Use costBasisValue if available, otherwise calculate from averagePrice * quantity
        const calculatedCostBasis = costBasisValue || (averagePrice && quantity ? averagePrice * Math.abs(quantity) : undefined);

        positions.push({
          row: rowNum,
          symbol,
          quantity,
          averagePrice,
          lastPrice,
          marketValue,
          costBasis: calculatedCostBasis,
          unrealizedPL: marketValue && calculatedCostBasis ? marketValue - calculatedCostBasis : undefined,
          assetClass: instrument.assetClass,
          isOption: instrument.assetClass === "OPTION",
          optionDetails: instrument.option ? {
            underlying: instrument.underlying?.symbol,
            strike: instrument.option.strike,
            expiration: instrument.option.expiration.toISOString().split('T')[0],
            right: instrument.option.right,
          } : undefined,
        });
      } catch (error) {
        errors.push({
          row: rowNum,
          symbol: row[mapping.symbol] || "Unknown",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Calculate summary stats
    const totalMarketValue = positions.reduce((sum, p) => sum + (p.marketValue || 0), 0);
    const totalCostBasis = positions.reduce((sum, p) => sum + (p.costBasis || 0), 0);
    const totalUnrealizedPL = positions.reduce((sum, p) => sum + (p.unrealizedPL || 0), 0);

    const byAssetClass = positions.reduce((acc, p) => {
      acc[p.assetClass] = (acc[p.assetClass] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      fileName,
      detectedBroker: {
        broker: detectedBroker.broker,
        confidence: detectedBroker.confidence,
        displayName: getBrokerDisplayName(detectedBroker.broker),
        detectedFrom: detectedBroker.detectedFrom,
      },
      summary: {
        totalRows: parsed.rows.length,
        validPositions: positions.length,
        errors: errors.length,
        totalMarketValue,
        totalCostBasis,
        totalUnrealizedPL,
        byAssetClass,
        accountSummary: parsed.accountSummary,
      },
      columnMapping: mapping,
      positions: positions, // Show all positions in preview
      errors: errors.slice(0, 100), // Limit errors to first 100
      hasMore: false, // No longer limiting positions
    });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json(
      {
        error: "Failed to preview file",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
