"use client";

import { useState } from "react";

function fmtUSD(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function MonthBanner({
  month,
  realized,
  endNav,
  prevEndNav,
  navChange,
  returnPct,
  unrealizedSnapshot,
  onNavUpdated,
}: {
  month: string; // yyyy-mm
  realized: number | null;
  endNav: number | null;
  prevEndNav: number | null;
  navChange: number | null;
  returnPct: number | null;
  unrealizedSnapshot: number | null;
  onNavUpdated?: () => void;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [navValue, setNavValue] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const profit = (realized ?? 0) > 0;
  const loss = (realized ?? 0) < 0;
  const unrealizedTone =
    unrealizedSnapshot == null || unrealizedSnapshot === 0
      ? undefined
      : unrealizedSnapshot > 0
      ? "pos"
      : "neg";
  const navTone =
    navChange == null || navChange === 0 ? undefined : navChange > 0 ? "pos" : "neg";
  const returnTone =
    returnPct == null || returnPct === 0 ? undefined : returnPct > 0 ? "pos" : "neg";

  // Format month as "November 2025"
  const formatMonthYear = (yyyyMM: string) => {
    const [year, month] = yyyyMM.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get last day of the month for the NAV entry
  const getEndOfMonth = (yyyyMM: string) => {
    const [year, month] = yyyyMM.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  };

  const openDialog = () => {
    setNavValue(endNav ? String(endNav) : "");
    setNote("");
    setShowDialog(true);
  };

  const saveNav = async () => {
    if (!navValue) return alert("NAV value is required");
    setSaving(true);
    const endOfMonthDate = getEndOfMonth(month);
    const res = await fetch("/api/nav/monthly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: endOfMonthDate, nav: navValue, note: note || undefined }),
    });
    setSaving(false);
    if (!res.ok) return alert("Failed to save NAV");
    setShowDialog(false);
    // Notify parent to refresh data
    if (onNavUpdated) onNavUpdated();
  };

  return (
    <>
      <div className="card p-4 mb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatMonthYear(month)}</div>
          <button
            className="px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            onClick={openDialog}
          >
            Edit Month-End NAV
          </button>
        </div>
        <div className="grid md:grid-cols-5 gap-3 items-center">
        <Stat label="Realized (MTD)" value={fmtUSD(realized ?? 0)} tone={profit ? "pos" : loss ? "neg" : undefined} />
        <Stat label="Begin NAV" value={prevEndNav == null || prevEndNav === 0 ? "-" : fmtUSD(prevEndNav)} />
        <Stat label="NAV change" value={navChange == null ? "-" : fmtUSD(navChange)} tone={navTone} />
        <Stat label="Return %" value={returnPct == null ? "-" : `${(returnPct * 100).toFixed(2)}%`} tone={returnTone} />
        <Stat label="End NAV" value={endNav == null || endNav === 0 ? "-" : fmtUSD(endNav)} />
        <Stat label="Unrealized (last)" value={unrealizedSnapshot == null ? "-" : fmtUSD(unrealizedSnapshot)} tone={unrealizedTone} />
        </div>
      </div>

      {showDialog && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowDialog(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-4 w-full max-w-md border dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="font-medium mb-2 text-slate-900 dark:text-slate-100">Edit Month-End NAV — {month}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              This will set the end-of-month NAV for {getEndOfMonth(month)}
            </div>
            <div className="space-y-2">
              <input
                className="border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                placeholder="NAV value (required)"
                value={navValue}
                onChange={(e) => setNavValue(e.target.value)}
                type="number"
                step="0.01"
              />
              <input
                className="border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="mt-3 flex gap-2 justify-end">
              <button className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors" onClick={() => setShowDialog(false)}>Cancel</button>
              <button
                className="px-3 py-1.5 rounded-md bg-gold-600 hover:bg-gold-700 text-white disabled:opacity-50 transition-colors"
                disabled={saving}
                onClick={saveNav}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-lg font-semibold ${tone === "pos" ? "text-emerald-700 dark:text-emerald-400" : tone === "neg" ? "text-red-700 dark:text-red-400" : "text-slate-900 dark:text-slate-100"}`}>{value}</div>
    </div>
  );
}
