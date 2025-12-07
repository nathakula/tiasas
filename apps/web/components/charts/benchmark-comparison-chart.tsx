"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format } from "date-fns";

interface BenchmarkDataPoint {
  date: string;
  userReturn: number;
  [key: string]: number | string; // Dynamic benchmark keys (SPY, QQQ, etc.)
}

interface BenchmarkComparisonChartProps {
  data: BenchmarkDataPoint[];
  benchmarks: string[]; // e.g., ["SPY", "QQQ"]
  compact?: boolean; // Smaller height for summary view
}

const BENCHMARK_COLORS: Record<string, string> = {
  user: "#eab308", // Gold/Yellow for user
  SPY: "#3b82f6", // Blue for S&P 500
  QQQ: "#ec4899", // Pink/Magenta for Nasdaq (more distinct from blue)
  IWM: "#10b981", // Green for Russell 2000
  DIA: "#f97316", // Orange for Dow Jones
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="card bg-card/90 backdrop-blur border-white/10 p-3 shadow-xl">
        <p className="font-medium text-slate-900 dark:text-slate-100 mb-2">
          {format(new Date(label), "MMM d, yyyy")}
        </p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-500 dark:text-slate-400">
              {entry.name === "userReturn" ? "Your Portfolio" : entry.name}:
            </span>
            <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
              {entry.value > 0 ? "+" : ""}
              {entry.value.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function BenchmarkComparisonChart({
  data,
  benchmarks,
  compact = false,
}: BenchmarkComparisonChartProps) {
  const [isDark, setIsDark] = useState(false);

  // Detect dark mode on mount and when theme changes
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    // Listen for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  if (!data || data.length === 0) {
    return (
      <div
        className={`${compact ? "h-[200px]" : "h-[400px]"
          } w-full flex items-center justify-center text-slate-500 dark:text-slate-500`}
      >
        No data available
      </div>
    );
  }

  // Calculate min/max for Y axis
  const allValues = data.flatMap((d) => [
    d.userReturn,
    ...benchmarks.map((b) => d[b] as number),
  ]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const padding = Math.abs(maxValue - minValue) * 0.1;

  // Theme-aware colors
  const gridColor = isDark ? "#334155" : "#cbd5e1";
  const textColor = isDark ? "#94a3b8" : "#64748b";

  return (
    <div className={`w-full ${compact ? "h-[250px]" : "h-[450px]"}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={gridColor}
            vertical={false}
            opacity={0.3}
          />
          <XAxis
            dataKey="date"
            stroke={textColor}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => format(new Date(value), "MMM d")}
            minTickGap={compact ? 50 : 30}
          />
          <YAxis
            stroke={textColor}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value > 0 ? "+" : ""}${value.toFixed(0)}%`}
            domain={[minValue - padding, maxValue + padding]}
          />
          <Tooltip content={<CustomTooltip />} />
          {!compact && <Legend />}

          {/* User's Portfolio - Highlighted */}
          <Line
            type="monotone"
            dataKey="userReturn"
            name="Your Portfolio"
            stroke={BENCHMARK_COLORS.user}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
            animationDuration={3500}
            animationEasing="ease-out"
          />

          {/* Benchmark Lines */}
          {benchmarks.map((benchmark) => (
            <Line
              key={benchmark}
              type="monotone"
              dataKey={benchmark}
              name={benchmark}
              stroke={BENCHMARK_COLORS[benchmark] || "#64748b"}
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
              activeDot={{ r: 4 }}
              animationDuration={4000}
              animationEasing="ease-out"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
