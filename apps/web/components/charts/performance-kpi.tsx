
"use client";

import { useEffect, useState } from "react";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/skeleton";

export interface PerformanceMetrics {
    sharpeRatio: number | null;
    sortinoRatio: number | null;
    stdDev: number | null;
    annualizedVol: number | null;
    daysAnalyzed: number;
    winRate: number | null;
    totalTrades: number;
}

export function PerformanceKpi({ orgId, metrics }: { orgId: string; metrics?: PerformanceMetrics | null }) {
    const [data, setData] = useState<PerformanceMetrics | null>(metrics || null);
    const [loading, setLoading] = useState(!metrics);

    // Animated values for gauges
    const [animatedSharpe, setAnimatedSharpe] = useState(0);
    const [animatedSortino, setAnimatedSortino] = useState(0);
    const [animatedWinRate, setAnimatedWinRate] = useState(0);

    useEffect(() => {
        if (metrics) {
            setData(metrics);
            setLoading(false);
            return;
        }

        async function fetchData() {
            setLoading(true);
            try {
                const res = await fetch(`/api/performance?orgId=${orgId}`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (e) {
                console.error("Failed to fetch performance metrics", e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [orgId, metrics]);

    // Animate gauges when data changes
    useEffect(() => {
        if (!data || loading) return;

        const targetSharpe = data.sharpeRatio || 0;
        const targetSortino = data.sortinoRatio || 0;
        const targetWinRate = (data.winRate || 0) * 100;

        const duration = 1500; // 1.5 seconds
        const steps = 60; // 60 steps for smooth animation
        const stepDuration = duration / steps;

        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;

            // Easing function (ease-out cubic)
            const easeOut = 1 - Math.pow(1 - progress, 3);

            setAnimatedSharpe(targetSharpe * easeOut);
            setAnimatedSortino(targetSortino * easeOut);
            setAnimatedWinRate(targetWinRate * easeOut);

            if (currentStep >= steps) {
                clearInterval(interval);
                // Set final values to ensure precision
                setAnimatedSharpe(targetSharpe);
                setAnimatedSortino(targetSortino);
                setAnimatedWinRate(targetWinRate);
            }
        }, stepDuration);

        return () => clearInterval(interval);
    }, [data, loading]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <Skeleton className="h-[200px] w-full rounded-xl" />
            </div>
        );
    }

    // Helper for gauge color
    const getScoreColor = (value: number) => {
        if (value >= 2) return "#22c55e"; // Green
        if (value >= 1) return "#eab308"; // Yellow
        return "#ef4444"; // Red
    };

    // Use animated values for display
    const sharpeValue = animatedSharpe;
    const sortinoValue = animatedSortino;
    const winRateValue = animatedWinRate;

    // Data for Recharts
    const sharpeData = [{ name: 'Sharpe', value: sharpeValue, fill: getScoreColor(sharpeValue) }];
    const sortinoData = [{ name: 'Sortino', value: sortinoValue, fill: getScoreColor(sortinoValue) }];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sharpe Ratio Card */}
            <div className="card bg-card/50 backdrop-blur-sm border-white/10">
                <div className="p-4 pb-2 border-b border-white/5">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-center">Sharpe Ratio</h3>
                </div>
                <div className="flex flex-col items-center justify-center p-6 pt-0">
                    <div className="h-[140px] w-full relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart
                                innerRadius="70%"
                                outerRadius="100%"
                                barSize={10}
                                data={sharpeData}
                                startAngle={180}
                                endAngle={0}
                            >
                                <PolarAngleAxis
                                    type="number"
                                    domain={[0, 4]} // Scale 0 to 4
                                    angleAxisId={0}
                                    tick={false}
                                />
                                <RadialBar
                                    background
                                    dataKey="value"
                                    cornerRadius={30}
                                    fill={getScoreColor(sharpeValue)}
                                />
                            </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 text-center">
                            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{sharpeValue.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {sharpeValue >= 2 ? "Excellent" : sharpeValue >= 1 ? "Good" : "Poor"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sortino Ratio Card */}
            <div className="card bg-card/50 backdrop-blur-sm border-white/10">
                <div className="p-4 pb-2 border-b border-white/5">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-center">Sortino Ratio</h3>
                </div>
                <div className="flex flex-col items-center justify-center p-6 pt-0">
                    <div className="h-[140px] w-full relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart
                                innerRadius="70%"
                                outerRadius="100%"
                                barSize={10}
                                data={sortinoData}
                                startAngle={180}
                                endAngle={0}
                            >
                                <PolarAngleAxis
                                    type="number"
                                    domain={[0, 4]} // Scale 0 to 4
                                    angleAxisId={0}
                                    tick={false}
                                />
                                <RadialBar
                                    background
                                    dataKey="value"
                                    cornerRadius={30}
                                    fill={getScoreColor(sortinoValue)}
                                />
                            </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 text-center">
                            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{sortinoValue.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {sortinoValue >= 2 ? "Excellent" : sortinoValue >= 1 ? "Good" : "Poor"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Win Rate Card */}
            <div className="card bg-card/50 backdrop-blur-sm border-white/10">
                <div className="p-4 pb-2 border-b border-white/5">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-center">Win Rate</h3>
                </div>
                <div className="flex flex-col items-center justify-center p-6 pt-0">
                    <div className="h-[140px] w-full relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart
                                innerRadius="70%"
                                outerRadius="100%"
                                barSize={10}
                                data={[{ name: 'WinRate', value: winRateValue, fill: winRateValue >= 50 ? "#22c55e" : "#ef4444" }]}
                                startAngle={180}
                                endAngle={0}
                            >
                                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                                <RadialBar background dataKey="value" cornerRadius={30} />
                            </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 text-center">
                            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{winRateValue.toFixed(0)}%</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {data?.totalTrades} Trades
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
