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
      // Current positions from BrokerBridge - get latest snapshot per account
      prisma.$queryRaw`
        SELECT DISTINCT ON (ps."accountId") ps.*
        FROM "PositionSnapshot" ps
        INNER JOIN "BrokerAccount" ba ON ps."accountId" = ba.id
        INNER JOIN "BrokerConnection" bc ON ba."connectionId" = bc.id
        WHERE bc."orgId" = ${orgId}
        ORDER BY ps."accountId", ps."asOf" DESC
      `.then(async (snapshots: any[]) => {
        // Fetch full snapshot data with relations for each latest snapshot
        return await prisma.positionSnapshot.findMany({
          where: {
            id: {
              in: snapshots.map((s) => s.id),
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
        });
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

    // Extract position lots from all snapshots (across all accounts)
    const allPositionLots = positionSnapshots.flatMap((snapshot) =>
      snapshot.positionLots.map((lot) => ({
        lot,
        snapshot,
      }))
    );

    // Aggregate positions by symbol (matching what Positions page shows)
    const aggregatedPositions = new Map<string, {
      symbol: string;
      totalQuantity: number;
      weightedAvgPrice: number;
      currentPrice: number;
      totalUnrealizedPnl: number;
      totalCostBasis: number;
      totalMarketValue: number;
      brokers: Set<string>;
      accounts: Set<string>;
      lastUpdated: Date;
    }>();

    allPositionLots.forEach(({ lot, snapshot }) => {
      const symbol = lot.instrument.symbol;
      const quantity = Number(lot.quantity);
      const avgPrice = Number(lot.averagePrice) || 0;
      const marketPrice = Number(lot.marketPrice) || 0;
      const unrealizedPL = Number(lot.unrealizedPL) || 0;
      const costBasis = Number(lot.costBasis) || (quantity * avgPrice);
      const marketValue = Number(lot.marketValue) || (quantity * marketPrice);

      if (aggregatedPositions.has(symbol)) {
        const existing = aggregatedPositions.get(symbol)!;
        const newTotalQuantity = existing.totalQuantity + quantity;
        const newTotalCostBasis = existing.totalCostBasis + costBasis;
        const newTotalMarketValue = existing.totalMarketValue + marketValue;

        aggregatedPositions.set(symbol, {
          symbol,
          totalQuantity: newTotalQuantity,
          weightedAvgPrice: newTotalQuantity > 0 ? newTotalCostBasis / newTotalQuantity : 0,
          currentPrice: marketPrice, // Use latest price
          totalUnrealizedPnl: existing.totalUnrealizedPnl + unrealizedPL,
          totalCostBasis: newTotalCostBasis,
          totalMarketValue: newTotalMarketValue,
          brokers: existing.brokers.add(snapshot.account.connection.broker || "Unknown"),
          accounts: existing.accounts.add(snapshot.account.nickname || snapshot.account.maskedNumber || "Unknown"),
          lastUpdated: snapshot.asOf > existing.lastUpdated ? snapshot.asOf : existing.lastUpdated,
        });
      } else {
        aggregatedPositions.set(symbol, {
          symbol,
          totalQuantity: quantity,
          weightedAvgPrice: avgPrice,
          currentPrice: marketPrice,
          totalUnrealizedPnl: unrealizedPL,
          totalCostBasis: costBasis,
          totalMarketValue: marketValue,
          brokers: new Set([snapshot.account.connection.broker || "Unknown"]),
          accounts: new Set([snapshot.account.nickname || snapshot.account.maskedNumber || "Unknown"]),
          lastUpdated: snapshot.asOf,
        });
      }
    });

    const positions = Array.from(aggregatedPositions.values());

    // Determine context mode
    let mode: "positions" | "recent_trades" | "no_data" = "no_data";
    if (positions.length > 0) {
      mode = "positions";
    } else if (recentTrades.length > 0) {
      mode = "recent_trades";
    }

    // Format positions for AI context
    const positionsContext = positions.map((pos) => ({
      symbol: pos.symbol,
      quantity: pos.totalQuantity,
      averagePrice: pos.weightedAvgPrice,
      currentPrice: pos.currentPrice,
      unrealizedPnl: pos.totalUnrealizedPnl,
      unrealizedPnlPercent: pos.totalCostBasis > 0 ? (pos.totalUnrealizedPnl / pos.totalCostBasis) * 100 : 0,
      broker: Array.from(pos.brokers).join(", "),
      account: Array.from(pos.accounts).join(", "),
      lastUpdated: pos.lastUpdated,
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
