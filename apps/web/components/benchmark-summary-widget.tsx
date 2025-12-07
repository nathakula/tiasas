"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { BenchmarkComparisonChart } from "./charts/benchmark-comparison-chart";

interface BenchmarkSummaryData {
  userReturn: number;
  outperformance: Array<{
    symbol: string;
    name: string;
    difference: number;
  }>;
  chartData: any[];
  benchmarks: string[];
}

export function BenchmarkSummaryWidget() {
  const [data, setData] = useState<BenchmarkSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/performance/benchmarks?year=${new Date().getFullYear()}`);
        if (!res.ok) throw new Error("Failed to fetch");

        const result = await res.json();

        // Prepare compact chart data
        const chartData = result.series.user.data.map((userPoint: any, index: number) => {
          const point: any = {
            date: userPoint.date,
            userReturn: userPoint.percentReturn,
          };

          result.series.benchmarks.forEach((benchmark: any) => {
            const benchmarkPoint = benchmark.data[index];
            if (benchmarkPoint) {
              point[benchmark.symbol] = benchmarkPoint.percentReturn;
            }
          });

          return point;
        });

        setData({
          userReturn: result.userReturn,
          outperformance: result.outperformance,
          chartData,
          benchmarks: result.series.benchmarks.map((b: any) => b.symbol),
        });
      } catch (err) {
        console.error("Failed to load benchmark data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="card bg-card/50 backdrop-blur-sm border-white/10 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="h-40 bg-slate-700 rounded"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-slate-700 rounded"></div>
            <div className="h-20 bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null; // Hide if no data (e.g., no starting capital configured)
  }

  return (
    <div className="card bg-card/50 backdrop-blur-sm border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Performance vs Benchmarks
        </h2>
        <Link
          href="/market-desk/performance"
          className="text-sm text-gold-600 dark:text-gold-400 hover:underline flex items-center gap-1"
        >
          View Details <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Compact Chart */}
      <BenchmarkComparisonChart
        data={data.chartData}
        benchmarks={data.benchmarks}
        compact={true}
      />

      {/* Outperformance Stats */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Your Return */}
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
          <p className="text-xs text-slate-400 mb-1">Your Return (YTD)</p>
          <p className="text-2xl font-bold text-yellow-400">
            {data.userReturn > 0 ? "+" : ""}
            {data.userReturn.toFixed(2)}%
          </p>
        </div>

        {/* Outperformance vs Benchmarks */}
        {data.outperformance.map((perf) => {
          const isOutperforming = perf.difference > 0;
          return (
            <div
              key={perf.symbol}
              className={`rounded-lg p-3 border ${
                isOutperforming
                  ? "bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20"
                  : "bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20"
              }`}
            >
              <p className="text-xs text-slate-400 mb-1">vs {perf.symbol}</p>
              <div className="flex items-center gap-2">
                {isOutperforming ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <p
                  className={`text-2xl font-bold ${
                    isOutperforming ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {perf.difference > 0 ? "+" : ""}
                  {perf.difference.toFixed(2)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
