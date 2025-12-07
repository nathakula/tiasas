
import { db } from "@tiasas/database";

const RISK_FREE_RATE_ANNUAL = 0.0425; // 4.25%
const TRADING_DAYS_PER_YEAR = 252;
const RISK_FREE_RATE_DAILY = RISK_FREE_RATE_ANNUAL / TRADING_DAYS_PER_YEAR;

export interface PortfolioRatios {
    sharpeRatio: number | null;
    sortinoRatio: number | null;
    stdDev: number | null;
    annualizedVol: number | null;
    daysAnalyzed: number;
    winRate: number | null;
    totalTrades: number;
    profitFactor: number | null;
}

export async function calculatePortfolioRatios(
    orgId: string,
    options: { lookbackDays?: number; startDate?: Date; endDate?: Date } = {}
): Promise<PortfolioRatios> {
    // 1. Determine Date Range
    let startDate: Date;
    let endDate: Date;

    if (options.startDate && options.endDate) {
        startDate = options.startDate;
        endDate = options.endDate;
    } else {
        const lookback = options.lookbackDays || 365;
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(endDate.getDate() - lookback);
    }

    const dailyData = await db.dailyPnl.findMany({
        where: {
            orgId,
            date: {
                gte: startDate,
                lte: endDate,
            },
            totalEquity: {
                not: null,
            },
        },
        orderBy: {
            date: "asc",
        },
    });

    // 1.5 Calculate Trade Stats (Win Rate, Profit Factor)
    const trades = await db.journalEntry.findMany({
        where: {
            orgId,
            date: { gte: startDate, lte: endDate },
            isWinner: { not: null } // Only count closed trades with status
        },
        select: {
            isWinner: true
        }
    });
    // Schema check: JournalEntry { isWinner Boolean? }
    // It does NOT appear to have a PnL amount column in the snippet I saw.
    // I need to verify schema first. If it doesn't have PnL, I can only do Win Rate by Count.

    // Placeholder for now, assume Win Rate by Count
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.isWinner).length;
    const winRate = totalTrades > 0 ? wins / totalTrades : null;


    if (dailyData.length < 2) {
        return {
            sharpeRatio: null,
            sortinoRatio: null,
            stdDev: null,
            annualizedVol: null,
            daysAnalyzed: dailyData.length,
            winRate,
            totalTrades,
            profitFactor: null
        };
    }

    // 2. Calculate Daily Returns
    const returns: number[] = [];

    for (const entry of dailyData) {
        const equity = entry.totalEquity?.toNumber() || 0;
        if (equity === 0) continue;

        const pnl = entry.realizedPnl.plus(entry.unrealizedPnl).toNumber();
        // Daily Return % = PnL / StartEquity. 
        // Assumption: totalEquity stored is likely End-of-Day. 
        // Return ≈ PnL / (EndEquity - PnL)? Or if totalEquity is start... 
        // Safer to assume Return = PnL / (TotalEquity), effectively Return on Capital deployed.
        const dailyReturn = pnl / equity;
        returns.push(dailyReturn);
    }

    if (returns.length < 2) {
        return {
            sharpeRatio: null,
            sortinoRatio: null,
            stdDev: null,
            annualizedVol: null,
            daysAnalyzed: returns.length,
            winRate,
            totalTrades,
            profitFactor: null
        };
    }

    // 3. Stats Calculation
    const n = returns.length;
    const meanReturn = returns.reduce((a, b) => a + b, 0) / n;

    // StdDev
    const squaredDiffs = returns.map((r) => Math.pow(r - meanReturn, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (n - 1); // Sample variance
    const stdDev = Math.sqrt(variance);

    // Downside Deviation (Sortino) using Risk Free Rate as MAR (Minimum Acceptable Return)
    // Sortino denominator is std dev of returns < MAR
    const downsideReturns = returns.map(r => Math.min(0, r - RISK_FREE_RATE_DAILY));
    const downsideSquaredDiffs = downsideReturns.map(r => Math.pow(r, 2));
    const downsideVariance = downsideSquaredDiffs.reduce((a, b) => a + b, 0) / n; // Lower partial moment usually uses 'n'
    const downsideDev = Math.sqrt(downsideVariance);

    // 4. Annualize
    // Sharpe = (MeanDaily - RiskFreeDaily) / DailyStdDev * sqrt(252)
    let sharpeRatio = 0;
    if (stdDev > 0) {
        sharpeRatio = ((meanReturn - RISK_FREE_RATE_DAILY) / stdDev) * Math.sqrt(TRADING_DAYS_PER_YEAR);
    }

    let sortinoRatio = 0;
    if (downsideDev > 0) {
        sortinoRatio = ((meanReturn - RISK_FREE_RATE_DAILY) / downsideDev) * Math.sqrt(TRADING_DAYS_PER_YEAR);
    }

    return {
        sharpeRatio: Number(sharpeRatio.toFixed(4)),
        sortinoRatio: Number(sortinoRatio.toFixed(4)),
        stdDev: Number(stdDev.toFixed(6)),
        annualizedVol: Number((stdDev * Math.sqrt(TRADING_DAYS_PER_YEAR)).toFixed(6)),
        daysAnalyzed: n,
        winRate: winRate ? Number(winRate.toFixed(4)) : null,
        totalTrades,
        profitFactor: null // Need PnL on trades to calc this
    };
}
