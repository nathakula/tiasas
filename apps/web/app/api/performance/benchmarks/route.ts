import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";
import { fetchBenchmarkSeries, calculateEquityCurve } from "@tiasas/core/src/market/benchmarks";

export const dynamic = "force-dynamic";

/**
 * GET /api/performance/benchmarks
 * Fetches user's equity curve vs benchmark performance
 * Query params:
 *   - year: Year to fetch (default: current year)
 *   - range: Time range (1mo, 3mo, 6mo, 1y) - default: 1y
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log("[Benchmarks API] Session:", { email: session?.user?.email, user: session?.user });

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.membership.findFirst({
      where: { user: { email: session.user.email } },
      select: { orgId: true },
    });

    console.log("[Benchmarks API] Membership:", membership);

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const range = (searchParams.get("range") || "1y") as "1mo" | "3mo" | "6mo" | "1y";

    // 1. Get performance settings for the year
    const settings = await prisma.yearlyPerformanceSettings.findUnique({
      where: {
        orgId_year: {
          orgId: membership.orgId,
          year,
        },
      },
    });

    if (!settings) {
      return NextResponse.json({
        error: `No performance settings found for year ${year}. Please configure starting capital.`,
      }, { status: 404 });
    }

    const startingCapital = Number(settings.startingCapital);
    const benchmarks = settings.benchmarks || ["SPY", "QQQ"];

    // 2. Fetch user's daily equity data
    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate = new Date(`${year + 1}-01-01T00:00:00Z`);

    const dailyPnl = await prisma.dailyPnl.findMany({
      where: {
        orgId: membership.orgId,
        date: {
          gte: startDate,
          lt: endDate,
        },
        totalEquity: { not: null },
      },
      select: {
        date: true,
        totalEquity: true,
      },
      orderBy: { date: "asc" },
    });

    if (dailyPnl.length === 0) {
      return NextResponse.json({
        error: `No equity data found for ${year}`,
      }, { status: 404 });
    }

    // 3. Calculate user's equity curve as percentage returns
    const userEquityCurve = calculateEquityCurve(
      dailyPnl.map(d => ({
        date: d.date,
        totalEquity: Number(d.totalEquity),
      })),
      startingCapital
    );

    // 4. Fetch benchmark data for the SAME date range as user's portfolio
    // This ensures apples-to-apples comparison (YTD vs YTD, not trailing 12 months)
    const benchmarkSeries = await fetchBenchmarkSeries(benchmarks, range, startDate, new Date());

    // 5. Calculate current stats
    const latestEquity = Number(dailyPnl[dailyPnl.length - 1].totalEquity);
    const userReturn = ((latestEquity - startingCapital) / startingCapital) * 100;

    return NextResponse.json({
      year,
      startingCapital,
      currentEquity: latestEquity,
      userReturn: Number(userReturn.toFixed(2)),
      series: {
        user: {
          symbol: "USER",
          name: "Your Portfolio",
          data: userEquityCurve,
          ytdReturn: Number(userReturn.toFixed(2)),
        },
        benchmarks: benchmarkSeries,
      },
      outperformance: benchmarkSeries.map(b => ({
        symbol: b.symbol,
        name: b.name,
        difference: Number((userReturn - b.ytdReturn).toFixed(2)),
      })),
    });
  } catch (error: any) {
    console.error("Error fetching benchmark data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch benchmark data" },
      { status: 500 }
    );
  }
}
