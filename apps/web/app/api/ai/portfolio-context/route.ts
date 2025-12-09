import { NextResponse } from "next/server";
import { getActiveOrgId } from "@/lib/org";
import { db as prisma } from "@/lib/db";
import { startOfMonth, subDays } from "date-fns";

/**
 * Portfolio Advisor Context API
 * Fetches current positions, recent trades, and performance metrics
 * for AI-powered portfolio analysis
 */
export async function GET() {
  try {
    const orgId = await getActiveOrgId();
    if (!orgId) {
      return NextResponse.json({ error: "No active organization" }, { status: 401 });
    }

    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    const monthStart = startOfMonth(today);

    // Fetch data in parallel
    const [positionSnapshots, recentTrades, mtdPnl, latestPnl, performanceMetrics] = await Promise.all([
      // Current positions from BrokerBridge - get latest snapshot
      prisma.positionSnapshot.findMany({
        where: {
          account: {
            connection: {
              orgId: orgId,
            },
          },
        },
        include: {
          positionLots: {
            include: {
              instrument: true,
            },
          },
          account: {
            include: {
              connection: {
                select: {
                  broker: true,
                },
              },
            },
          },
        },
        orderBy: { asOf: "desc" },
        take: 1, // Get the latest snapshot
      }),

      // Recent trades (last 30 days with non-zero realized P&L)
      prisma.dailyPnl.findMany({
        where: {
          orgId,
          date: { gte: thirtyDaysAgo },
          realizedPnl: { not: 0 },
        },
        orderBy: { date: "desc" },
        take: 20,
        select: {
          id: true,
          date: true,
          realizedPnl: true,
          unrealizedPnl: true,
          note: true,
        },
      }),

      // Month-to-date P&L
      prisma.dailyPnl.findMany({
        where: {
          orgId,
          date: { gte: monthStart },
        },
        select: {
          realizedPnl: true,
          unrealizedPnl: true,
        },
      }),

      // Latest P&L entry
      prisma.dailyPnl.findFirst({
        where: { orgId },
        orderBy: { date: "desc" },
        select: {
          date: true,
          realizedPnl: true,
          unrealizedPnl: true,
          totalEquity: true,
        },
      }),

      // Performance metrics (Sharpe, Sortino, Win Rate)
      prisma.dailyPnl.findMany({
        where: {
          orgId,
          date: { gte: monthStart },
        },
        select: {
          realizedPnl: true,
        },
      }),
    ]);

    // Calculate metrics
    const mtdRealized = mtdPnl.reduce((sum, p) => sum + Number(p.realizedPnl), 0);
    const currentUnrealized = latestPnl ? Number(latestPnl.unrealizedPnl) : 0;
    const currentEquity = latestPnl ? Number(latestPnl.totalEquity) : null;

    // Calculate win rate from recent trades
    const winningTrades = recentTrades.filter((t) => Number(t.realizedPnl) > 0).length;
    const totalTrades = recentTrades.length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : null;

    // Calculate simple Sharpe approximation (daily returns std dev)
    const dailyReturns = performanceMetrics.map((p) => Number(p.realizedPnl));
    const avgReturn = dailyReturns.length > 0
      ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
      : 0;
    const variance = dailyReturns.length > 1
      ? dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (dailyReturns.length - 1)
      : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : null; // Annualized

    // Extract position lots from snapshots
    const positions = positionSnapshots.length > 0
      ? positionSnapshots[0].positionLots
      : [];

    // Determine context mode
    let mode: "positions" | "recent_trades" | "no_data" = "no_data";
    if (positions.length > 0) {
      mode = "positions";
    } else if (recentTrades.length > 0) {
      mode = "recent_trades";
    }

    // Format positions for AI context
    const positionsContext = positions.map((lot) => ({
      symbol: lot.instrument.symbol,
      quantity: Number(lot.quantity),
      averagePrice: Number(lot.averagePrice) || 0,
      currentPrice: Number(lot.marketPrice) || 0,
      unrealizedPnl: Number(lot.unrealizedPL) || 0,
      unrealizedPnlPercent: Number(lot.unrealizedPLPct) || 0,
      broker: positionSnapshots[0]?.account.connection.broker || "Unknown",
      account: positionSnapshots[0]?.account.nickname || positionSnapshots[0]?.account.maskedNumber || "Unknown",
      lastUpdated: positionSnapshots[0]?.asOf || new Date(),
    }));

    // Format recent trades for AI context
    const tradesContext = recentTrades.map((t) => ({
      date: t.date,
      realizedPnl: Number(t.realizedPnl),
      unrealizedPnl: Number(t.unrealizedPnl),
      note: t.note,
    }));

    return NextResponse.json({
      mode,
      positions: positionsContext,
      recentTrades: tradesContext,
      metrics: {
        mtdRealized,
        currentUnrealized,
        currentEquity,
        winRate,
        sharpeRatio,
        totalPositions: positions.length,
        totalRecentTrades: recentTrades.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching portfolio context:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio context", details: error.message },
      { status: 500 }
    );
  }
}
