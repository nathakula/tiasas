// Fetch benchmark historical data for performance comparison
import { getChart } from "./yahoo";

export interface BenchmarkDataPoint {
  date: Date;
  symbol: string;
  close: number;
  percentReturn: number; // % return from starting price
}

export interface BenchmarkSeries {
  symbol: string;
  name: string;
  data: BenchmarkDataPoint[];
  ytdReturn: number; // Year-to-date return percentage
}

/**
 * Fetch historical data for a benchmark symbol
 * @param symbol - Ticker symbol (e.g., "SPY", "QQQ")
 * @param range - Time range (default "1y")
 * @param startDate - Optional: Filter data from this date (for YTD calculations)
 * @param endDate - Optional: Filter data until this date
 * @returns Array of daily closes with calculated returns
 */
export async function fetchBenchmarkData(
  symbol: string,
  range: "1mo" | "3mo" | "6mo" | "1y" = "1y",
  startDate?: Date,
  endDate?: Date
): Promise<BenchmarkDataPoint[]> {
  const chartData = await getChart(symbol, range, "1d");
  if (!chartData || chartData.length === 0) {
    throw new Error(`No data available for ${symbol}`);
  }

  // Filter by date range if provided
  let filteredData = chartData;
  if (startDate || endDate) {
    filteredData = chartData.filter((point) => {
      const pointDate = point.t;
      if (startDate && pointDate < startDate) return false;
      if (endDate && pointDate > endDate) return false;
      return true;
    });
  }

  if (filteredData.length === 0) {
    throw new Error(`No data available for ${symbol} in the specified date range`);
  }

  const startingPrice = filteredData[0].close;
  if (!startingPrice || startingPrice === 0) {
    throw new Error(`Invalid starting price for ${symbol}`);
  }

  return filteredData.map((point) => ({
    date: point.t,
    symbol,
    close: point.close as number,
    percentReturn: ((point.close as number) - startingPrice) / startingPrice * 100,
  }));
}

/**
 * Fetch multiple benchmarks and return as series
 * @param symbols - Array of ticker symbols
 * @param range - Time range
 * @param startDate - Optional: Filter data from this date (for YTD calculations)
 * @param endDate - Optional: Filter data until this date
 * @returns Array of benchmark series with calculated returns
 */
export async function fetchBenchmarkSeries(
  symbols: string[],
  range: "1mo" | "3mo" | "6mo" | "1y" = "1y",
  startDate?: Date,
  endDate?: Date
): Promise<BenchmarkSeries[]> {
  const benchmarkNames: Record<string, string> = {
    SPY: "S&P 500",
    QQQ: "Nasdaq 100",
    IWM: "Russell 2000",
    DIA: "Dow Jones",
  };

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const data = await fetchBenchmarkData(symbol, range, startDate, endDate);
        const ytdReturn = data[data.length - 1]?.percentReturn ?? 0;

        return {
          symbol,
          name: benchmarkNames[symbol] ?? symbol,
          data,
          ytdReturn,
        };
      } catch (error) {
        console.error(`Failed to fetch ${symbol}:`, error);
        return null;
      }
    })
  );

  return results.filter((r): r is BenchmarkSeries => {
    if (!r) return false;
    // Debug logging
    if (r.data.length > 0) {
      const first = r.data[0];
      const last = r.data[r.data.length - 1];
      console.log(`[Benchmarks Debug] ${r.symbol}: Start ${first.date.toISOString()} ($${first.close}) -> End ${last.date.toISOString()} ($${last.close}) = ${r.ytdReturn.toFixed(2)}%`);
    }
    return true;
  });
}

/**
 * Calculate user's equity curve as percentage returns
 * @param equityData - Array of { date, totalEquity } points
 * @param startingCapital - Initial capital amount
 * @returns Array of data points with percentage returns
 */
export function calculateEquityCurve(
  equityData: Array<{ date: Date; totalEquity: number }>,
  startingCapital: number
): BenchmarkDataPoint[] {
  return equityData.map((point) => ({
    date: point.date,
    symbol: "USER",
    close: point.totalEquity,
    percentReturn: ((point.totalEquity - startingCapital) / startingCapital) * 100,
  }));
}
