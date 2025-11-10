"use client";
import { useEffect, useMemo, useState } from "react";
import { MonthlyPnlChart, NavByMonthChart, YtdCards } from "./charts_widgets";

export default function ChartsClient() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [monthly, setMonthly] = useState<{ month: string; realized: number; navEnd: number }[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/pnl/monthly?year=${year}`);
      if (!res.ok) { setMonthly([]); return; }
      const data = await res.json();
      const months = (data.months || []).map((m: any) => ({ month: m.month, realized: Number(m.realized ?? 0), navEnd: Number(m.endNav ?? 0) }));
      setMonthly(months);
    }
    load();
  }, [year]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="text-sm text-slate-600">Year</div>
        <select className="border rounded-md px-2 py-1" value={year} onChange={(e)=>setYear(Number(e.target.value))}>
          {Array.from({length: 11}, (_,i)=>currentYear-5+i).map((y)=> <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <YtdCards monthly={monthly} />
      <div className="card p-4">
        <div className="font-medium mb-2">Monthly Realized P&L</div>
        <MonthlyPnlChart monthly={monthly} />
      </div>
      <div className="card p-4">
        <div className="font-medium mb-2">NAV by Month</div>
        <NavByMonthChart monthly={monthly} />
      </div>
    </div>
  );
}

