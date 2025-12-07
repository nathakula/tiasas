
"use client";

import {
    ComposedChart,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import { format } from "date-fns";

interface EquityCurveProps {
    data: {
        date: string; // ISO date string or formatted date
        userEquity: number;
        benchmarkEquity?: number;
    }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="card bg-card/90 backdrop-blur border-white/10 p-3 shadow-xl">
                <p className="font-medium text-slate-900 dark:text-slate-100 mb-2">{label}</p>
                {payload.map((entry: any) => (
                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-slate-500 dark:text-slate-400 capitalize">
                            {entry.name === "userEquity" ? "User P&L" : "Benchmark"}:
                        </span>
                        <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                            {new Intl.NumberFormat(undefined, {
                                style: "currency",
                                currency: "USD",
                                maximumFractionDigits: 0
                            }).format(entry.value)}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export function EquityCurveChart({ data }: EquityCurveProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-[300px] w-full flex items-center justify-center text-slate-500">
                No data available
            </div>
        )
    }

    // Calculate min/max for Y axis scaling
    const minValue = Math.min(...data.map(d => Math.min(d.userEquity, d.benchmarkEquity || d.userEquity)));
    const maxValue = Math.max(...data.map(d => Math.max(d.userEquity, d.benchmarkEquity || d.userEquity)));
    const padding = (maxValue - minValue) * 0.1;

    return (
        <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={data}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorUser" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                    <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => format(new Date(value), "MMM d")}
                        minTickGap={30}
                    />
                    <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) =>
                            new Intl.NumberFormat(undefined, {
                                style: "currency",
                                currency: "USD",
                                notation: "compact",
                                maximumFractionDigits: 1
                            }).format(value)
                        }
                        domain={[minValue - padding, maxValue + padding]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />

                    {/* User Equity - Area + Line */}
                    <Area
                        type="monotone"
                        dataKey="userEquity"
                        name="User P&L"
                        stroke="#eab308" // Gold
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorUser)"
                    />

                    {/* Benchmark - Line Only */}
                    <Line
                        type="monotone"
                        dataKey="benchmarkEquity"
                        name="Benchmark"
                        stroke="#64748b" // Slate
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="5 5"
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
