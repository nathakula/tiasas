"use client";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { isWeekend, isUsMarketHoliday } from "@/lib/market-calendar";

export default function CalendarClient({ days, counts, pnl }: { days: string[]; counts: Record<string, { e: number; t: number }>; pnl: Record<string, { realized: string; unrealized: string; navEnd: string; note: string }> }) {
  const [open, setOpen] = useState<string | null>(null);
  const [realized, setRealized] = useState("");
  const [unrealized, setUnrealized] = useState("");
  const [navEnd, setNavEnd] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const dayList = useMemo(() => days.map((d) => new Date(d)), [days]);

  function openFor(day: Date) {
    const key = format(day, "yyyy-MM-dd");
    const ex = pnl[key];
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
      <div className="grid grid-cols-7 gap-2">
        {dayList.map((d) => {
          const k = format(d, "yyyy-MM-dd");
          const c = counts[k] ?? { e: 0, t: 0 };
          const hasPnl = !!pnl[k];
          const weekend = isWeekend(d);
          const holiday = isUsMarketHoliday(d);
          const disabled = weekend || holiday;
          return (
            <button
              key={k}
              className={`card p-2 min-h-[90px] text-left ${hasPnl ? "ring-1 ring-emerald-400" : ""} ${disabled ? "opacity-60 grayscale" : "hover:shadow"}`}
              onClick={() => (!disabled ? openFor(d) : null)}
              title={disabled ? (weekend ? "Weekend" : "Market holiday") : "Click to add/edit P&L"}
            >
              <div className="text-xs text-slate-500">{format(d, "d MMM")}</div>
              <div className="text-xs mt-2">📝 {c.e} · 🔁 {c.t}</div>
              {hasPnl && (
                <div className="text-xs mt-1 text-emerald-700">P&L: {pnl[k].realized}</div>
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
