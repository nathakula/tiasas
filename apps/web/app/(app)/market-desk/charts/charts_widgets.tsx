"use client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts";

// Format month from "2025-01" to "Jan"
function formatMonthLabel(monthStr: string) {
  const [, month] = monthStr.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return monthNames[parseInt(month) - 1] || monthStr;
}

// Custom tooltip with dark mode support
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
        {formatMonthLabel(label)}
      </p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm text-slate-600 dark:text-slate-400">
          {entry.name === 'realized' ? 'Realized P&L' : entry.name === 'navEnd' ? 'NAV' : entry.name}:{' '}
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(entry.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

export function MonthlyPnlChart({ monthly }: { monthly: { month: string; realized: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={monthly}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tickFormatter={formatMonthLabel} />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="realized" fill="#0ea5e9" radius={[6,6,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function NavByMonthChart({ monthly }: { monthly: { month: string; navEnd: number | null }[] }) {
  // Carry forward last known NAV to subsequent months without NAV data
  const dataWithCarryForward: { month: string; navEnd: number }[] = [];
  let lastKnownNav: number | null = null;

  for (const m of monthly) {
    // Treat 0 as null/undefined for NAV (carry forward instead)
    const hasValidNav = m.navEnd != null && m.navEnd !== 0;

    if (hasValidNav) {
      // Month has explicit NAV data (non-zero)
      lastKnownNav = m.navEnd!;
      dataWithCarryForward.push({ month: m.month, navEnd: m.navEnd! });
    } else if (lastKnownNav != null) {
      // Carry forward last known NAV for months without data or with 0
      dataWithCarryForward.push({ month: m.month, navEnd: lastKnownNav });
    }
    // If no NAV data yet (first months), skip the month
  }

  const hasData = dataWithCarryForward.length > 0;
  const showDots = dataWithCarryForward.length <= 2; // if only 1-2 points, show dots so it's visible

  return (
    <div className="h-64">
      {hasData ? (
        <ResponsiveContainer>
          <LineChart data={dataWithCarryForward}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tickFormatter={formatMonthLabel} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="navEnd" stroke="#10b981" strokeWidth={2} dot={showDots} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400 text-sm">No month-end NAV data</div>
      )}
    </div>
  );
}

export function YtdCards({ monthly }: { monthly: { month: string; realized: number; navEnd: number | null }[] }) {
  const ytdRealized = monthly.reduce((acc, m) => acc + (m.realized ?? 0), 0);
  // Find last non-zero NAV (treat 0 as null/undefined)
  const lastNav = ([...monthly].reverse().find((m) => m.navEnd != null && m.navEnd !== 0)?.navEnd ?? 0);
  const monthsCount = monthly.filter((m) => (m.navEnd != null && m.navEnd !== 0) || (Math.abs(m.realized ?? 0) > 0)).length;
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="card p-4">
        <div className="text-slate-500 dark:text-slate-400 text-sm">YTD Realized</div>
        <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{fmt(ytdRealized)}</div>
      </div>
      <div className="card p-4">
        <div className="text-slate-500 dark:text-slate-400 text-sm">NAV (last)</div>
        <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{fmt(lastNav)}</div>
      </div>
      <div className="card p-4">
        <div className="text-slate-500 dark:text-slate-400 text-sm">Months</div>
        <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{monthsCount}</div>
      </div>
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}
