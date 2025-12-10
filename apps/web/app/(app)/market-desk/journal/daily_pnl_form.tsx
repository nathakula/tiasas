"use client";
import { useEffect, useState } from "react";

export function DailyPnlForm() {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [realized, setRealized] = useState<string>("");
  const [unrealized, setUnrealized] = useState<string>("");
  const [totalEquity, setTotalEquity] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Prefill on date change if a record already exists
  useEffect(() => {
    let ignore = false;
    async function loadExisting() {
      const res = await fetch(`/api/pnl/daily?from=${date}&to=${date}`);
      if (!res.ok) {
        if (!ignore) {
          setRealized(""); setUnrealized(""); setTotalEquity(""); setNote("");
        }
        return;
      }
      const rows = await res.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!ignore) {
        if (row) {
          setRealized(String(row.realizedPnl ?? ""));
          setUnrealized(String(row.unrealizedPnl ?? ""));
          setTotalEquity(String(row.totalEquity ?? ""));
          setNote(String(row.note ?? ""));
        } else {
          setRealized(""); setUnrealized(""); setTotalEquity(""); setNote("");
        }
      }
    }
    loadExisting();
    return () => { ignore = true; };
  }, [date]);

  async function save() {
    if (!realized) return alert("Realized P&L is required");
    setSaving(true);
    const res = await fetch("/api/pnl/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        realizedPnl: realized,
        unrealizedPnl: unrealized || undefined,
        totalEquity: totalEquity || undefined,
        note: note || undefined
      }),
    });
    setSaving(false);
    if (!res.ok) return alert("Failed to save P&L");
    setRealized("");
    setUnrealized("");
    setTotalEquity("");
    setNote("");
    alert("Saved daily P&L");
  }

  return (
    <div className="card p-4">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Daily P&L Entry</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Record your daily trading performance numbers: realized P&L, unrealized P&L, and total account equity. This is for quantitative data only.
        </p>
      </div>
      <div className="grid md:grid-cols-5 gap-2">
        <input className="border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input className="border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="Realized P&L (Required)" value={realized} onChange={(e) => setRealized(e.target.value)} />
        <input className="border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="Unrealized P&L" value={unrealized} onChange={(e) => setUnrealized(e.target.value)} />
        <input className="border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="Total Equity" value={totalEquity} onChange={(e) => setTotalEquity(e.target.value)} />
        <input className="border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="Note (Optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="mt-3">
        <button className="px-3 py-1.5 rounded-md bg-gold-600 hover:bg-gold-700 text-white disabled:opacity-50 transition-colors" disabled={saving} onClick={save}>Save P&L Entry</button>
      </div>
    </div>
  );
}
