"use client";
import { format } from "date-fns";
import { useMemo, useState, useEffect } from "react";
import { isWeekend, isUsMarketHoliday, holidayName } from "@/lib/market-calendar";
import { MonthBanner } from "@/components/month-banner";

export default function CalendarClient({ initialMonth, days, counts, pnl }: { initialMonth: string; days: string[]; counts: Record<string, { e: number; t: number }>; pnl: Record<string, { realized: string; unrealized: string; navEnd: string; note: string }> }) {
  const [open, setOpen] = useState<string | null>(null);
  const [month, setMonth] = useState<string>(initialMonth); // yyyy-MM
  const [data, setData] = useState<{ counts: typeof counts; pnl: typeof pnl; days: string[] }>({ counts, pnl, days });
  const [calMap, setCalMap] = useState<Record<string, { name: string; type: "HOLIDAY" | "EARLY_CLOSE" }>>({});
  const [summary, setSummary] = useState<{ month: string; realized: number | null; endNav: number | null; navChange: number | null; returnPct: number | null; unrealizedSnapshot: number | null } | null>(null);
  const [realized, setRealized] = useState("");
  const [unrealized, setUnrealized] = useState("");
  const [navEnd, setNavEnd] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Keep days as YYYY-MM-DD strings; avoid timezone shifts
  const dayList = useMemo(() => data.days as string[], [data.days]);

  async function loadMonth(yyyyMM: string) {
    const [y, m] = yyyyMM.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    const params = (from: Date, to: Date) => `from=${from.toISOString().slice(0,10)}&to=${to.toISOString().slice(0,10)}`;
    const [entries, trades, pnlRows, mapResp, monthly] = await Promise.all([
      fetch(`/api/journal?${params(start, end)}`).then(safeJson),
      fetch(`/api/trades?${params(start, end)}`).then(safeJson),
      fetch(`/api/pnl/daily?${params(start, end)}`).then(safeJson),
      fetch(`/api/market-calendar?year=${y}`).then(safeJson),
      fetch(`/api/pnl/monthly?from=${start.toISOString().slice(0,10)}&to=${end.toISOString().slice(0,10)}`).then(safeJson),
    ]);
    const each: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) each.push(new Date(d).toISOString());
    const byDay = new Map<string, { e: number; t: number }>();
    each.forEach((iso) => {
      const k = iso.slice(0,10);
      byDay.set(k, { e: 0, t: 0 });
    });
    (entries || []).forEach((e: any) => {
      const k = e.date.slice(0,10);
      byDay.set(k, { ...(byDay.get(k) ?? { e: 0, t: 0 }), e: (byDay.get(k)?.e ?? 0) + 1 });
    });
    (trades || []).forEach((t: any) => {
      const k = t.date.slice(0,10);
      byDay.set(k, { ...(byDay.get(k) ?? { e: 0, t: 0 }), t: (byDay.get(k)?.t ?? 0) + 1 });
    });
    const pnlMap = new Map<string, { realized: string; unrealized: string; navEnd: string; note: string }>();
    (pnlRows || []).forEach((p: any) => {
      const k = p.date.slice(0,10);
      pnlMap.set(k, { realized: p.realizedPnl, unrealized: p.unrealizedPnl, navEnd: p.navEnd, note: p.note ?? "" });
    });
    setData({ counts: Object.fromEntries(byDay.entries()) as any, pnl: Object.fromEntries(pnlMap.entries()) as any, days: each });
    if (mapResp && (mapResp as any).days) setCalMap((mapResp as any).days);
    if (monthly && (monthly as any).months) {
      const mKey = `${y}-${String(m).padStart(2,"0")}`;
      const item = (monthly as any).months.find((x: any) => x.month === mKey);
      if (item) setSummary(item);
    }
  }

  // Initial refresh to ensure CSV overrides and map are loaded
  useEffect(() => { loadMonth(month); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setNavEnd(ex?.navEnd ?? "");
    setNote(ex?.note ?? "");
  }

  async function save() {
    if (!open) return;
    if (!realized) return alert("Realized P&L is required");
    setSaving(true);
    const res = await fetch("/api/pnl/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: open, realizedPnl: realized, unrealizedPnl: unrealized || undefined, navEnd: navEnd || "0", note: note || undefined }),
    });
    setSaving(false);
    if (!res.ok) return alert("Failed to save");
    setOpen(null);
    location.reload();
  }

  return (
    <>
      {/* Month summary banner */}
      {summary && (
        <MonthBanner
          month={summary.month}
          realized={summary.realized}
          endNav={summary.endNav}
          navChange={summary.navChange}
          returnPct={summary.returnPct}
          unrealizedSnapshot={summary.unrealizedSnapshot}
          navSeries={data.days.map((iso)=>({ date: iso.slice(8,10), nav: data.pnl[iso.slice(0,10)] ? Number(data.pnl[iso.slice(0,10)].navEnd) : NaN })).filter(p=>!Number.isNaN(p.nav))}
        />
      )}
      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-slate-600">Month</div>
        <div className="flex items-center gap-2">
          <button
            className="px-2 py-1 border rounded-md"
            onClick={() => {
              const [ys, ms] = month.split("-");
              let y = Number(ys); let m = Number(ms) - 1;
              if (m < 1) { m = 12; y -= 1; }
              const next = `${y}-${String(m).padStart(2, "0")}`;
              setMonth(next); loadMonth(next);
            }}
          >Prev</button>
          <select className="border rounded-md px-2 py-1" value={month.split("-")[1]} onChange={(e)=>{ const next = `${month.split("-")[0]}-${e.target.value}`; setMonth(next); loadMonth(next); }}>
            {Array.from({length:12},(_,i)=>String(i+1).padStart(2,"0")).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="border rounded-md px-2 py-1" value={month.split("-")[0]} onChange={(e)=>{ const next = `${e.target.value}-${month.split("-")[1]}`; setMonth(next); loadMonth(next); }}>
            {Array.from({length:11},(_,i)=> (new Date().getFullYear()-5+i)).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            className="px-2 py-1 border rounded-md"
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
      <div className="grid grid-cols-7 gap-2 mb-1 text-xs text-slate-500">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d)=>(<div key={d} className="px-2">{d}</div>))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {(() => {
          const items: JSX.Element[] = [];
          const first = dayList[0];
          if (first) {
            const blanks = new Date(`${first}T12:00:00Z`).getDay(); // 0=Sun
            for (let i = 0; i < blanks; i++) items.push(<div key={`b-${i}`} />);
          }
          return items;
        })()}
        {dayList.map((k) => {
          const c = data.counts[k] ?? { e: 0, t: 0 };
          const p = data.pnl[k];
          const hasPnl = !!p;
          const dObj = new Date(`${k}T12:00:00Z`);
          const key = k;
          const override = calMap[key];
          const weekend = isWeekend(dObj);
          const holiday = override?.type === "HOLIDAY" ? true : isUsMarketHoliday(dObj);
          const earlyClose = override?.type === "EARLY_CLOSE";
          const today = new Date();
          const future = dObj > new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const disabled = weekend || holiday || future;
          const realizedNum = hasPnl ? Number(p.realized) : 0;
          const profit = hasPnl && realizedNum > 0;
          const loss = hasPnl && realizedNum < 0;
          const hName = holiday ? (override?.name ?? holidayName(dObj)) : null;
          const badge = holiday ? (hName || "Holiday") : earlyClose ? (override?.name || "Early close") : weekend ? "Weekend" : future ? "Future" : null;
          const badgeTitle = holiday ? `Market holiday: ${hName ?? ""}` : earlyClose ? "Early close" : weekend ? "Weekend" : future ? "Future date" : "";
          return (
            <button
              key={k}
              className={`card p-2 min-h-[90px] text-left relative ${profit ? "ring-1 ring-emerald-400 bg-emerald-50" : ""} ${loss ? "ring-1 ring-red-400 bg-red-50" : ""} ${disabled ? "opacity-60" : "hover:shadow"}`}
              onClick={() => (!disabled ? openFor(d) : null)}
              title={disabled ? (holiday ? "Market holiday" : weekend ? "Weekend" : "Future date") : "Click to add/edit P&L"}
            >
              <div className="text-xs text-slate-500">{format(dObj, "d MMM")}</div>
              <div className="text-xs mt-2">📝 {c.e} · 🔁 {c.t}</div>
              {hasPnl && (
                <div className={`text-xs mt-1 ${profit ? "text-emerald-700" : loss ? "text-red-700" : "text-slate-600"}`}>P&L: {p.realized}</div>
              )}
              {badge && (
                <span className={`absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full border ${holiday ? "bg-amber-50 border-amber-300" : earlyClose ? "bg-amber-50 border-amber-300" : weekend ? "bg-slate-100" : "bg-white"}`} title={badgeTitle}>
                  {(holiday && hName) ? hName : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <div className="bg-white rounded-2xl shadow-soft p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="font-medium mb-2">Edit Daily P&L — {open}</div>
            <div className="grid grid-cols-2 gap-2">
              <input className="border rounded-md px-2 py-1 col-span-2" placeholder="Realized (required)" value={realized} onChange={(e) => setRealized(e.target.value)} />
              <input className="border rounded-md px-2 py-1" placeholder="Unrealized (optional)" value={unrealized} onChange={(e) => setUnrealized(e.target.value)} />
              <input className="border rounded-md px-2 py-1" placeholder="NAV end (optional)" value={navEnd} onChange={(e) => setNavEnd(e.target.value)} />
              <input className="border rounded-md px-2 py-1 col-span-2" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="mt-3 flex gap-2 justify-end">
              <button className="px-3 py-1.5 rounded-md border" onClick={() => setOpen(null)}>Cancel</button>
              <button className="px-3 py-1.5 rounded-md bg-black text-white disabled:opacity-50" disabled={saving} onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
