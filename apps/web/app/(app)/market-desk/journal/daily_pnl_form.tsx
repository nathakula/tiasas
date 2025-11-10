"use client";
import { useEffect, useState } from "react";

export function DailyPnlForm() {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [realized, setRealized] = useState<string>("");
  const [unrealized, setUnrealized] = useState<string>("");
  const [navEnd, setNavEnd] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Prefill on date change if a record already exists
  useEffect(() => {
    let ignore = false;
    async function loadExisting() {
      const res = await fetch(`/api/pnl/daily?from=${date}&to=${date}`);
      if (!res.ok) {
        if (!ignore) {
          setRealized(""); setUnrealized(""); setNavEnd(""); setNote("");
        }
        return;
      }
      const rows = await res.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!ignore) {
        if (row) {
          setRealized(String(row.realizedPnl ?? ""));
          setUnrealized(String(row.unrealizedPnl ?? ""));
          setNavEnd(String(row.navEnd ?? ""));
          setNote(String(row.note ?? ""));
        } else {
          setRealized(""); setUnrealized(""); setNavEnd(""); setNote("");
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
      body: JSON.stringify({ date, realizedPnl: realized, unrealizedPnl: unrealized || undefined, navEnd: navEnd || "0", note: note || undefined }),
    });
    setSaving(false);
    if (!res.ok) return alert("Failed to save P&L");
    setRealized("");
    setUnrealized("");
    setNavEnd("");
    setNote("");
    alert("Saved daily P&L");
  }

  return (
    <div className="card p-4">
      <div className="font-medium mb-2">Add Daily P&L</div>
      <div className="grid md:grid-cols-5 gap-2">
        <input className="border rounded-md px-2 py-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input className="border rounded-md px-2 py-1" placeholder="Realized (required)" value={realized} onChange={(e) => setRealized(e.target.value)} />
        <input className="border rounded-md px-2 py-1" placeholder="Unrealized (optional)" value={unrealized} onChange={(e) => setUnrealized(e.target.value)} />
        <input className="border rounded-md px-2 py-1" placeholder="NAV end (optional)" value={navEnd} onChange={(e) => setNavEnd(e.target.value)} />
        <input className="border rounded-md px-2 py-1 md:col-span-2" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="mt-3">
        <button className="px-3 py-1.5 rounded-2xl bg-black text-white disabled:opacity-50" disabled={saving} onClick={save}>Save</button>
      </div>
    </div>
  );
}
