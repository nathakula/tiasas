"use client";

import { useState, useEffect } from "react";
import { BenchmarkComparisonChart } from "@/components/charts/benchmark-comparison-chart";
import { MonthlyPnlChart, NavByMonthChart } from "@/components/charts/monthly-widgets";
import { TrendingUp, TrendingDown, Target, Calendar } from "lucide-react";
import { useCounterAnimation } from "@/hooks/use-counter-animation";
import { ExportButton } from "@/components/export/export-button";

interface BenchmarkData {
  year: number;
  startingCapital: number;
  currentEquity: number;
  userReturn: number;
  series: {
    user: {
      symbol: string;
      name: string;
      data: Array<{
        date: string;
        close: number;
        percentReturn: number;
      }>;
      ytdReturn: number;
    };
    benchmarks: Array<{
      symbol: string;
      name: string;
      data: Array<{
        date: string;
        close: number;
        percentReturn: number;
      }>;
      ytdReturn: number;
    }>;
  };
  outperformance: Array<{
    symbol: string;
    name: string;
    difference: number;
  }>;
}

interface MonthlyData {
  month: string;
  realized: number;
  navEnd: number | null;
}

function AnimatedPerformanceStat({ value, suffix = "%", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  const animated = useCounterAnimation(value, 3000);
  return (
    <span>{prefix}{animated.toFixed(2)}{suffix}</span>
  );
}


export function PerformanceClient() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartKey, setChartKey] = useState(0); // Forces chart remount for animation

  // Generate year options dynamically: from 2023 to current year + 1
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let year = 2023; year <= currentYear + 1; year++) {
    yearOptions.push(year);
  }

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch Performance & Benchmarks
        const resPerf = await fetch(`/api/performance/benchmarks?year=${selectedYear}`);

        // Fetch Monthly PnL & NAV
        const resMonthly = await fetch(`/api/pnl/monthly?year=${selectedYear}`);

        // Handle Monthly Data
        if (resMonthly.ok) {
          const mJson = await resMonthly.json();
          const months = (mJson.months || []).map((m: any) => ({
            month: m.month,
            realized: Number(m.realized ?? 0),
            navEnd: m.endNav == null ? null : Number(m.endNav),
          }));
          setMonthlyData(months);
        }

        // Handle Performance Data
        if (!resPerf.ok) {
          const errorData = await resPerf.json();
          // If 404 on equity data, we might still have monthly data, so don't block entirely?
          // But performance page relies heavily on the main data.
          // Let's throw error for now to show the error state which is helpful.
          throw new Error(errorData.error || "Failed to fetch benchmark data");
        }

        const result = await resPerf.json();
        setData(result);
        setChartKey(prev => prev + 1); // Trigger chart animation on data load
      } catch (err: any) {
        console.error("Error fetching benchmarks:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedYear]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-1/4"></div>
          <div className="h-64 bg-slate-700 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 bg-slate-700 rounded"></div>
            <div className="h-32 bg-slate-700 rounded"></div>
            <div className="h-32 bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        {/* Year Selector - show even on error */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Performance Analysis</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Compare your trading performance against market benchmarks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card bg-red-500/10 dark:bg-red-500/10 border-red-500/20 p-6">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
            Error Loading Performance Data
          </h2>
          <p className="text-slate-700 dark:text-slate-300">{error}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">
            {error.includes("No performance settings") ? (
              <>
                You need to configure your starting capital for {selectedYear} in Settings.
              </>
            ) : error.includes("No equity data") ? (
              <>
                No trading data found for {selectedYear}.
                Make sure you have entries in your Daily P&L with Total Equity values.
              </>
            ) : (
              <>Make sure you have configured your starting capital and have trading data for {selectedYear}.</>
            )}
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  if (!data) return null;

  // Prepare chart data
  const chartData = data.series.user.data.map((userPoint) => {
    const point: any = {
      date: userPoint.date,
      userReturn: userPoint.percentReturn,
    };

    const userDateStr = new Date(userPoint.date).toISOString().split('T')[0];

    data.series.benchmarks.forEach((benchmark) => {
      // Find benchmark point with matching date (robust against index mismatch)
      const benchmarkPoint = benchmark.data.find(b =>
        new Date(b.date).toISOString().split('T')[0] === userDateStr
      );

      if (benchmarkPoint) {
        point[benchmark.symbol] = benchmarkPoint.percentReturn;
      } else {
        // If no data for this date, maybe use previous? Or null (break line).
        // For now, let's leave it undefined which Recharts handles by breaking line or interpolating.
      }
    });
    return point;
  });

  const benchmarkSymbols = data.series.benchmarks.map((b) => b.symbol);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Performance Analysis</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Compare your trading performance against market benchmarks.
          </p>
        </div>

        {/* Year Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-400" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Portfolio Return */}
        <div className="card bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 dark:from-yellow-500/10 dark:to-yellow-500/5 border-yellow-500/20 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Your Return</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {data.userReturn > 0 ? "+" : ""}
                <AnimatedPerformanceStat key={`user-${data.userReturn}`} value={data.userReturn} />
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-500 mt-2">
                ${(data.currentEquity - data.startingCapital).toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-500/50" />
          </div>
        </div>

        {/* Outperformance Cards */}
        {data.outperformance.map((perf) => {
          const isOutperforming = perf.difference > 0;
          return (
            <div
              key={perf.symbol}
              className={`card p-6 ${isOutperforming
                ? "bg-gradient-to-br from-green-500/10 to-green-500/5 dark:from-green-500/10 dark:to-green-500/5 border-green-500/20"
                : "bg-gradient-to-br from-red-500/10 to-red-500/5 dark:from-red-500/10 dark:to-red-500/5 border-red-500/20"
                }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">vs {perf.name}</p>
                  <p
                    className={`text-3xl font-bold ${isOutperforming ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}
                  >
                    {perf.difference > 0 ? "+" : ""}
                    <AnimatedPerformanceStat key={`diff-${perf.symbol}`} value={perf.difference} suffix="pp" />
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {isOutperforming ? "Outperforming" : "Underperforming"}
                  </p>
                </div>
                {isOutperforming ? (
                  <TrendingUp className="w-8 h-8 text-green-500/50" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-500/50" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance Chart */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Cumulative Returns ({selectedYear})
        </h2>
        <BenchmarkComparisonChart
          key={`benchmark-${chartKey}`}
          data={chartData}
          benchmarks={benchmarkSymbols}
        />
      </div>

      {/* Monthly Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly P&L Bar Chart */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Monthly Realized P&L
          </h2>
          <MonthlyPnlChart key={`pnl-${chartKey}`} monthly={monthlyData} />
        </div>

        {/* NAV Line Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              NAV & Equity
            </h2>
            <ExportButton
              endpoint="/api/export/nav"
              label="Export NAV"
              variant="secondary"
              dateRange={{
                startDate: `${selectedYear}-01-01`,
                endDate: `${selectedYear}-12-31`,
              }}
            />
          </div>
          <NavByMonthChart key={`nav-${chartKey}`} monthly={monthlyData} />
        </div>
      </div>

      {/* Detailed Stats Table */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Benchmark Comparison
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-300 dark:border-slate-700">
                <th className="pb-3 text-sm font-medium text-slate-600 dark:text-slate-400">Name</th>
                <th className="pb-3 text-sm font-medium text-slate-600 dark:text-slate-400">Symbol</th>
                <th className="pb-3 text-sm font-medium text-slate-600 dark:text-slate-400 text-right">
                  YTD Return
                </th>
                <th className="pb-3 text-sm font-medium text-slate-600 dark:text-slate-400 text-right">
                  Difference (pp)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {/* User Row */}
              <tr className="bg-yellow-500/5 dark:bg-yellow-500/5">
                <td className="py-3 font-medium text-slate-900 dark:text-slate-100">Your Portfolio</td>
                <td className="py-3 text-slate-600 dark:text-slate-400">—</td>
                <td className="py-3 text-right font-mono font-bold text-yellow-600 dark:text-yellow-400">
                  {data.userReturn > 0 ? "+" : ""}
                  <AnimatedPerformanceStat key={`table-user-${data.userReturn}`} value={data.userReturn} />
                </td>
                <td className="py-3 text-right text-slate-600 dark:text-slate-400">—</td>
              </tr>

              {/* Benchmark Rows */}
              {data.series.benchmarks.map((benchmark) => {
                const outperf = data.outperformance.find(
                  (o) => o.symbol === benchmark.symbol
                );
                const diff = outperf?.difference || 0;
                const isOutperforming = diff > 0;

                return (
                  <tr key={benchmark.symbol}>
                    <td className="py-3 text-slate-900 dark:text-slate-100">{benchmark.name}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-400 font-mono text-sm">
                      {benchmark.symbol}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      {benchmark.ytdReturn > 0 ? "+" : ""}
                      <AnimatedPerformanceStat key={`table-${benchmark.symbol}`} value={benchmark.ytdReturn} />
                    </td>
                    <td
                      className={`py-3 text-right font-mono font-medium ${isOutperforming ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }`}
                    >
                      {diff > 0 ? "+" : ""}
                      <AnimatedPerformanceStat key={`table-diff-${benchmark.symbol}`} value={diff} suffix="pp" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Starting Capital Info */}
      <div className="card p-4 bg-slate-200/50 dark:bg-slate-800/50">
        <div className="space-y-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium text-slate-800 dark:text-slate-300">Starting Capital ({selectedYear}):</span>{" "}
            ${data.startingCapital.toLocaleString()} →{" "}
            <span className="font-medium text-slate-800 dark:text-slate-300">Current Equity:</span>{" "}
            ${data.currentEquity.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
            💡 "pp" = percentage points. For example, if you made +54% and SPY made +17%, you outperformed by +37pp (54 - 17 = 37 percentage point difference).
          </p>
        </div>
      </div>
    </div >
  );
}
