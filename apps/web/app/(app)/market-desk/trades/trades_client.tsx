"use client";
import { useState } from "react";
import { format } from "date-fns";

type Trade = {
  id: string;
  date: string | Date;
  symbol: string;
  side: string;
  qty: string;
  price: string;
  fees: string;
  strategyTag: string;
  notes?: string | null;
};

export default function TradesClient({ initialTrades }: { initialTrades: Trade[] }) {
  const [trades, setTrades] = useState<Trade[]>(initialTrades);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<string>("");

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    symbol: "",
    side: "BUY",
    qty: "1",
    price: "0",
    fees: "0",
    strategyTag: "discretionary",
    notes: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function createTrade() {
    const res = await fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) return alert("Failed to create trade");
    const created = await res.json();
    setTrades((prev) => [created, ...prev]);
  }

  async function deleteTrade(id: string) {
    const res = await fetch(`/api/trades/${id}`, { method: "DELETE" });
    if (!res.ok) return alert("Failed to delete");
    setTrades((prev) => prev.filter((t) => t.id !== id));
  }

  async function startEdit(t: Trade) {
    setEditingId(t.id);
    setEditNotes(String(t.notes ?? ""));
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/trades/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: editNotes }),
    });
    if (!res.ok) return alert("Failed to update");
    const updated = await res.json();
    setTrades((prev) => prev.map((t) => (t.id === id ? updated : t)));
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="card p-4 grid md:grid-cols-7 gap-2">
        <input className="border rounded-md px-2 py-1" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        <input className="border rounded-md px-2 py-1" placeholder="Symbol" value={form.symbol} onChange={(e) => set("symbol", e.target.value.toUpperCase())} />
        <select className="border rounded-md px-2 py-1" value={form.side} onChange={(e) => set("side", e.target.value)}>
          {['BUY','SELL','SELL_CALL','SELL_PUT','ASSIGN','EXPIRE'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="border rounded-md px-2 py-1" placeholder="Qty" value={form.qty} onChange={(e) => set("qty", e.target.value)} />
        <input className="border rounded-md px-2 py-1" placeholder="Price" value={form.price} onChange={(e) => set("price", e.target.value)} />
        <input className="border rounded-md px-2 py-1" placeholder="Fees" value={form.fees} onChange={(e) => set("fees", e.target.value)} />
        <input className="border rounded-md px-2 py-1" placeholder="Strategy" value={form.strategyTag} onChange={(e) => set("strategyTag", e.target.value)} />
        <div className="md:col-span-7">
          <input className="border rounded-md px-2 py-1 w-full" placeholder="Notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
        <div className="md:col-span-7">
          <button className="px-3 py-1.5 rounded-2xl bg-black text-white" onClick={createTrade}>Add trade</button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-2">Date</th>
            <th>Symbol</th>
            <th>Side</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Fees</th>
            <th>Strategy</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.id} className="border-b">
              <td className="py-2">{format(new Date(t.date), "yyyy-MM-dd")}</td>
              <td>{t.symbol}</td>
              <td>{t.side}</td>
              <td>{t.qty}</td>
              <td>{t.price}</td>
              <td>{t.fees}</td>
              <td>{t.strategyTag}</td>
              <td className="w-[280px]">
                {editingId === t.id ? (
                  <div className="flex items-center gap-2">
                    <input className="border rounded-md px-2 py-1 w-full" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                    <button className="text-blue-600" onClick={() => saveEdit(t.id)}>Save</button>
                    <button className="text-slate-600" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="truncate" title={String(t.notes ?? "")}>{String(t.notes ?? "")}</span>
                    <button className="text-blue-600" onClick={() => startEdit(t)}>Edit</button>
                    <button className="text-red-600" onClick={() => deleteTrade(t.id)}>Delete</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
