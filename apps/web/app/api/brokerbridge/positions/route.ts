/**
 * API Route: /api/brokerbridge/positions
 * Query aggregated positions
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AssetClass, BrokerProvider } from "@prisma/client";
import {
  getAggregatedPositions,
  getPortfolioSummary,
  type PositionFilters,
} from "@/lib/brokerbridge";

/**
 * GET /api/brokerbridge/positions
 * Get aggregated positions with filters
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get("orgId");
    if (!orgId) {
      return NextResponse.json(
        { error: "Missing orgId parameter" },
        { status: 400 }
      );
    }

    // Build filters
    const filters: PositionFilters = {
      orgId,
    };

    const broker = searchParams.get("broker");
    if (broker && Object.values(BrokerProvider).includes(broker as BrokerProvider)) {
      filters.broker = broker as BrokerProvider;
    }

    const accountId = searchParams.get("accountId");
    if (accountId) {
      filters.accountId = accountId;
    }

    const assetClass = searchParams.get("assetClass");
    if (assetClass && Object.values(AssetClass).includes(assetClass as AssetClass)) {
      filters.assetClass = assetClass as AssetClass;
    }

    const optionsOnly = searchParams.get("optionsOnly");
    if (optionsOnly === "true") {
      filters.optionsOnly = true;
    }

    const symbol = searchParams.get("symbol");
    if (symbol) {
      filters.symbol = symbol;
    }

    const asOf = searchParams.get("asOf");
    if (asOf) {
      filters.asOf = new Date(asOf);
    }

    // Check if summary is requested
    const includeSummary = searchParams.get("includeSummary") === "true";

    const positions = await getAggregatedPositions(filters);

    const response: any = { positions };

    if (includeSummary) {
      const summary = await getPortfolioSummary(orgId, filters.asOf);
      response.summary = summary;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Get positions error:", error);
    return NextResponse.json(
      {
        error: "Failed to get positions",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
