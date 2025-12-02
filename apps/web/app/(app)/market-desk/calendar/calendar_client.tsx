"use client";
import { format } from "date-fns";
import { useMemo, useState, useEffect } from "react";
import { isWeekend, isUsMarketHoliday, holidayName } from "@/lib/market-calendar";
import { MonthBanner } from "@/components/month-banner";

export default function CalendarClient({ initialMonth, days, counts, pnl, initialSummary }: {
  initialMonth: string;
  days: string[];
  counts: Record<string, { e: number; t: number }>;
  pnl: Record<string, { realized: string; unrealized: string; note: string }>;
  initialSummary: { month: string; realized: number | null; endNav: number | null; prevEndNav: number | null; navChange: number | null; returnPct: number | null; unrealizedSnapshot: number | null };
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [month, setMonth] = useState<string>(initialMonth); // yyyy-MM
  const [data, setData] = useState<{ counts: typeof counts; pnl: typeof pnl; days: string[] }>({ counts, pnl, days });
  const [calMap, setCalMap] = useState<Record<string, { name: string; type: "HOLIDAY" | "EARLY_CLOSE" }>>({});
  const [summary, setSummary] = useState(initialSummary);
  const [realized, setRealized] = useState("");
  const [unrealized, setUnrealized] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Use local date in user's timezone, not UTC
  const todayIso = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Keep days as YYYY-MM-DD strings; avoid timezone shifts
  const dayList = useMemo(() => data.days as string[], [data.days]);

  // Load market calendar once on mount (only static data)
  useEffect(() => {
    const year = new Date().getFullYear();
    fetch(`/api/market-calendar?year=${year}`)
      .then(safeJson)
      .then((resp) => {
        if (resp && (resp as any).days) setCalMap((resp as any).days);
      });
  }, []);

  async function loadMonth(yyyyMM: string) {
    const [y, m] = yyyyMM.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    const params = (from: Date, to: Date) => `from=${from.toISOString().slice(0,10)}&to=${to.toISOString().slice(0,10)}`;
    const prevMonthStart = new Date(y, m - 2, 1);
    const prevMonthEnd = new Date(y, m - 1, 0);
    const [entries, pnlRows, monthly] = await Promise.all([
      fetch(`/api/journal?${params(start, end)}`).then(safeJson),
      fetch(`/api/pnl/daily?${params(start, end)}`).then(safeJson),
      // Fetch one extra month before so prevEndNav is available for banner
      fetch(`/api/pnl/monthly?from=${prevMonthStart.toISOString().slice(0,10)}&to=${end.toISOString().slice(0,10)}`).then(safeJson),
    ]);
    const each: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      each.push(new Date(d).toISOString().slice(0, 10));
    }
    const byDay = new Map<string, { e: number }>();
    each.forEach((iso) => {
      const k = iso.slice(0,10);
      byDay.set(k, { e: 0 });
    });
    (entries || []).forEach((e: any) => {
      const k = e.date.slice(0,10);
      byDay.set(k, { e: (byDay.get(k)?.e ?? 0) + 1 });
    });
    const pnlMap = new Map<string, { realized: string; unrealized: string; note: string }>();
    (pnlRows || []).forEach((p: any) => {
      const k = p.date.slice(0,10);
      pnlMap.set(k, { realized: p.realizedPnl, unrealized: p.unrealizedPnl, note: p.note ?? "" });
    });
    setData({ counts: Object.fromEntries(byDay.entries()) as any, pnl: Object.fromEntries(pnlMap.entries()) as any, days: each });
    if (monthly && (monthly as any).months) {
      const mKey = `${y}-${String(m).padStart(2, "0")}`;
      const item = (monthly as any).months.find((x: any) => x.month === mKey);
      if (item) setSummary(item);
      else setSummary({ month: mKey, realized: 0, endNav: null, prevEndNav: null, navChange: null, returnPct: null, unrealizedSnapshot: null });
    }
  }

  async function safeJson(res: Response) {
    if (!res.ok) return null;
    try { return await res.json(); } catch { return null; }
  }

  function openFor(day: Date) {
    const key = format(day, "yyyy-MM-dd");
    const ex = data.pnl[key];
    setOpen(key);
    setRealized(ex?.realized ?? "");
    setUnrealized(ex?.unrealized ?? "");
    setNote(ex?.note ?? "");
  }

  async function save() {
    if (!open) return;
    if (!realized) return alert("Realized P&L is required");
    setSaving(true);
    const res = await fetch("/api/pnl/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: open, realizedPnl: realized, unrealizedPnl: unrealized || undefined, note: note || undefined }),
    });
    setSaving(false);
    if (!res.ok) return alert("Failed to save");

    // Optimistic update: update local state instead of full reload
    const updated = { realized, unrealized: unrealized || "0", note: note || "" };
    setData((prev) => ({
      ...prev,
      pnl: { ...prev.pnl, [open]: updated },
    }));

    // Recalculate summary if needed
    const currentMonthData = Object.entries(data.pnl).filter(([date]) => date.startsWith(month));
    const totalRealized = currentMonthData.reduce((sum, [, p]) => sum + Number(p.realized), 0) + Number(realized) - Number(data.pnl[open]?.realized || 0);
    setSummary((prev) => ({ ...prev, realized: totalRealized }));

    setOpen(null);
  }

  return (
    <>
      {/* Month summary banner */}
      {summary && (
        <MonthBanner
          month={summary.month}
          realized={summary.realized}
          endNav={summary.endNav}
          prevEndNav={summary.prevEndNav}
          navChange={summary.navChange}
          returnPct={summary.returnPct}
          unrealizedSnapshot={summary.unrealizedSnapshot}
          onNavUpdated={() => loadMonth(month)}
        />
      )}
      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-slate-600 dark:text-slate-400">Month</div>
        <div className="flex items-center gap-2">
          <button
            className="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            onClick={() => {
              const [ys, ms] = month.split("-");
              let y = Number(ys); let m = Number(ms) - 1;
              if (m < 1) { m = 12; y -= 1; }
              const next = `${y}-${String(m).padStart(2, "0")}`;
              setMonth(next); loadMonth(next);
            }}
          >Prev</button>
          <select className="border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300" value={month.split("-")[1]} onChange={(e)=>{ const next = `${month.split("-")[0]}-${e.target.value}`; setMonth(next); loadMonth(next); }}>
            {Array.from({length:12},(_,i)=>String(i+1).padStart(2,"0")).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300" value={month.split("-")[0]} onChange={(e)=>{ const next = `${e.target.value}-${month.split("-")[1]}`; setMonth(next); loadMonth(next); }}>
            {Array.from({length:11},(_,i)=> (new Date().getFullYear()-5+i)).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            className="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            onClick={() => {
              const [ys, ms] = month.split("-");
              let y = Number(ys); let m = Number(ms) + 1;
              if (m > 12) { m = 1; y += 1; }
              const next = `${y}-${String(m).padStart(2, "0")}`;
              setMonth(next); loadMonth(next);
            }}
          >Next</button>
        </div>
      </div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-2 mb-1 text-xs text-slate-500 dark:text-slate-400">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d)=>(<div key={d} className="px-2">{d}</div>))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {(() => {
          const items: JSX.Element[] = [];
          const first = dayList[0];
          if (first) {
            const fObj = first.includes("T") ? new Date(first) : new Date(`${first}T12:00:00Z`);
            const blanks = fObj.getDay(); // 0=Sun
            for (let i = 0; i < blanks; i++) items.push(<div key={`b-${i}`} />);
          }
          return items;
        })()}
        {dayList.map((k) => {
          const c = data.counts[k] ?? { e: 0 };
          const p = data.pnl[k];

          // Debug logging for December 1st
          if (k === '2025-12-01') {
            console.log('[Calendar Tile Debug] Dec 1st:', {
              k,
              p,
              pnlKeys: Object.keys(data.pnl),
              pnlDirect: data.pnl['2025-12-01'],
              dataState: data,
              propsP: pnl
            });
          }

          // Consider it has P&L if either realized or unrealized is present
          const hasPnl = !!p && (
            (p.realized !== undefined && p.realized !== null && p.realized !== "") ||
            (p.unrealized !== undefined && p.unrealized !== null && p.unrealized !== "" && p.unrealized !== "0")
          );
          const dObj = k.includes("T") ? new Date(k) : new Date(`${k}T12:00:00Z`);
          const key = k.includes("T") ? k.slice(0, 10) : k;
          const override = calMap[key];
          const weekend = isWeekend(dObj);
          const holiday = override?.type === "HOLIDAY" ? true : isUsMarketHoliday(dObj);
          const earlyClose = override?.type === "EARLY_CLOSE";
          const future = key > todayIso;
          // Only disable future dates - allow editing weekends/holidays (for options assignments, crypto, etc.)
          const disabled = future;
          const realizedNum = p && p.realized ? Number(p.realized) : 0;
          const unrealizedNum = p && p.unrealized ? Number(p.unrealized) : 0;
          const hasNote = hasPnl && p.note && p.note.trim().length > 0;
          const profit = hasPnl && realizedNum > 0;
          const loss = hasPnl && realizedNum < 0;
          const hName = holiday ? (override?.name ?? holidayName(dObj)) : null;
          const badge = holiday ? (hName || "Holiday") : earlyClose ? (override?.name || "Early close") : weekend ? "Weekend" : future ? "Future" : null;
          const badgeTitle = holiday ? `Market holiday: ${hName ?? ""}` : earlyClose ? "Early close" : weekend ? "Weekend" : future ? "Future date" : "";
          return (
            <button
              key={k}
              className={`card p-2 min-h-[100px] text-left relative ${profit ? "ring-1 ring-emerald-400 dark:ring-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" : ""} ${loss ? "ring-1 ring-red-400 dark:ring-red-600 bg-red-50 dark:bg-red-950/30" : ""} ${disabled ? "opacity-60" : "hover:shadow"}`}
              onClick={() => (!disabled ? openFor(dObj) : null)}
              title={disabled ? "Future date" : hasPnl ? "Click to edit P&L" : "Click to add P&L"}
            >
              <div className="flex items-start justify-between">
                <div className="text-xs text-slate-500 dark:text-slate-400">{format(dObj, "d MMM")}</div>
                <div className="flex gap-0.5">
                  {c.e > 0 && (
                    <span className="text-xs" title={`${c.e} journal ${c.e === 1 ? 'entry' : 'entries'}`}>📝</span>
                  )}
                  {hasNote && (
                    <span className="text-xs" title="Has note">💬</span>
                  )}
                </div>
              </div>
              {hasPnl && (
                <>
                  {p && p.realized !== undefined && p.realized !== null && p.realized !== "" && (
                    <div className={`text-xs font-medium mt-1 ${profit ? "text-emerald-700 dark:text-emerald-400" : loss ? "text-red-700 dark:text-red-400" : "text-slate-600 dark:text-slate-400"}`}>
                      P&L: {p.realized}
                    </div>
                  )}
                  {p && p.unrealized && p.unrealized !== "0" && (
                    <div className={`text-[10px] mt-0.5 ${unrealizedNum > 0 ? 'text-emerald-600 dark:text-emerald-500' : unrealizedNum < 0 ? 'text-red-600 dark:text-red-500' : 'text-slate-600 dark:text-slate-400'}`}>
                      U: {unrealizedNum > 0 ? '+' : ''}{p.unrealized}
                    </div>
                  )}
                </>
              )}
              {badge && (
                <span className={`absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full border ${holiday ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700" : earlyClose ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700" : weekend ? "bg-slate-100 dark:bg-slate-800" : "bg-white dark:bg-slate-800"}`} title={badgeTitle}>
                  {(holiday && hName) ? hName : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-4 w-full max-w-md border dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="font-medium mb-2 text-slate-900 dark:text-slate-100">Edit Daily P&L — {open}</div>
            <div className="grid grid-cols-2 gap-2">
              <input className="border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 col-span-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" placeholder="Realized (required)" value={realized} onChange={(e) => setRealized(e.target.value)} />
              <input className="border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 col-span-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" placeholder="Unrealized (optional)" value={unrealized} onChange={(e) => setUnrealized(e.target.value)} />
              <input className="border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 col-span-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="mt-3 flex gap-2 justify-end">
              <button className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors" onClick={() => setOpen(null)}>Cancel</button>
              <button className="px-3 py-1.5 rounded-md bg-gold-600 hover:bg-gold-700 text-white disabled:opacity-50 transition-colors" disabled={saving} onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
