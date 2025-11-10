"use client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts";

export function MonthlyPnlChart({ monthly }: { monthly: { month: string; realized: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={monthly}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="realized" fill="#0ea5e9" radius={[6,6,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function NavByMonthChart({ monthly }: { monthly: { month: string; navEnd: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <LineChart data={monthly}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="navEnd" stroke="#10b981" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function YtdCards({ monthly }: { monthly: { month: string; realized: number; navEnd: number }[] }) {
  const ytdRealized = monthly.reduce((acc, m) => acc + (m.realized ?? 0), 0);
  const lastNav = monthly.at(-1)?.navEnd ?? 0;
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="card p-4">
        <div className="text-slate-500 text-sm">YTD Realized</div>
        <div className="text-2xl font-semibold">{fmt(ytdRealized)}</div>
      </div>
      <div className="card p-4">
        <div className="text-slate-500 text-sm">NAV (last)</div>
        <div className="text-2xl font-semibold">{fmt(lastNav)}</div>
      </div>
      <div className="card p-4">
        <div className="text-slate-500 text-sm">Months</div>
        <div className="text-2xl font-semibold">{monthly.length}</div>
      </div>
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

