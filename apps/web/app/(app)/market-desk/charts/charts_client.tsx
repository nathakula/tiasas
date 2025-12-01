"use client";
import { useEffect, useState } from "react";
import { MonthlyPnlChart, NavByMonthChart, YtdCards } from "./charts_widgets";

export default function ChartsClient({
  initialYear,
  initialData,
}: {
  initialYear: number;
  initialData: { month: string; realized: number; navEnd: number | null }[];
}) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(initialYear);
  const [monthly, setMonthly] = useState<{ month: string; realized: number; navEnd: number | null }[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [hasChangedYear, setHasChangedYear] = useState(false);

  useEffect(() => {
    // Skip initial load since we have initialData, but allow subsequent changes
    if (!hasChangedYear && year === initialYear) {
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/pnl/monthly?year=${year}`);
        if (!res.ok) {
          setMonthly([]);
          setLoading(false);
          return;
        }
        const data = await res.json();
        const months = (data.months || []).map((m: any) => ({
          month: m.month,
          realized: Number(m.realized ?? 0),
          navEnd: m.endNav == null ? null : Number(m.endNav),
        }));
        setMonthly(months);
      } catch (error) {
        console.error('Failed to load monthly P&L:', error);
        setMonthly([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [year, initialYear, hasChangedYear]);

  const handleYearChange = (newYear: number) => {
    setHasChangedYear(true);
    setYear(newYear);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="text-sm text-slate-600 dark:text-slate-400">Year</div>
        <select className="border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={year} onChange={(e)=>handleYearChange(Number(e.target.value))} disabled={loading}>
          {Array.from({length: 11}, (_,i)=>currentYear-5+i).map((y)=> <option key={y} value={y}>{y}</option>)}
        </select>
        {loading && <span className="text-xs text-slate-500 dark:text-slate-400">Loading...</span>}
      </div>
      <YtdCards monthly={monthly} />
      <div className="card p-4">
        <div className="font-medium mb-2 text-slate-900 dark:text-slate-100">Monthly Realized P&L</div>
        <MonthlyPnlChart monthly={monthly} />
      </div>
      <div className="card p-4">
        <div className="font-medium mb-2 text-slate-900 dark:text-slate-100">NAV by Month</div>
        <NavByMonthChart monthly={monthly} />
      </div>
    </div>
  );
}
