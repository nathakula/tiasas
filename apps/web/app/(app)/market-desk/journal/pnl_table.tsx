"use client";
import { useState } from "react";
import { format } from "date-fns";

type PnlEntry = {
  id: string;
  date: Date;
  realizedPnl: string;
  unrealizedPnl: string;
  note: string | null;
};

export function PnlTable({ initialEntries }: { initialEntries: PnlEntry[] }) {
  const [entries, setEntries] = useState<PnlEntry[]>(initialEntries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ realized: string; unrealized: string; note: string }>({ realized: "", unrealized: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"date" | "realized">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const filteredEntries = entries
    .filter((entry) => {
      if (!searchTerm) return true;
      const dateStr = format(new Date(entry.date), "yyyy-MM-dd");
      const noteStr = (entry.note || "").toLowerCase();
      const search = searchTerm.toLowerCase();
      return dateStr.includes(search) || noteStr.includes(search);
    })
    .sort((a, b) => {
      const aVal = sortField === "date" ? new Date(a.date).getTime() : Number(a.realizedPnl);
      const bVal = sortField === "date" ? new Date(b.date).getTime() : Number(b.realizedPnl);
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });

  function startEdit(entry: PnlEntry) {
    setEditingId(entry.id);
    setEditValues({
      realized: entry.realizedPnl,
      unrealized: entry.unrealizedPnl,
      note: entry.note || "",
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    if (!editValues.realized) return alert("Realized P&L is required");

    setSaving(true);
    const entry = entries.find((e) => e.id === editingId);
    if (!entry) return;

    const res = await fetch("/api/pnl/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: format(new Date(entry.date), "yyyy-MM-dd"),
        realizedPnl: editValues.realized,
        unrealizedPnl: editValues.unrealized || undefined,
        note: editValues.note || undefined,
      }),
    });

    setSaving(false);
    if (!res.ok) return alert("Failed to save");

    // Update local state
    setEntries((prev) =>
      prev.map((e) =>
        e.id === editingId
          ? { ...e, realizedPnl: editValues.realized, unrealizedPnl: editValues.unrealized || "0", note: editValues.note || null }
          : e
      )
    );
    setEditingId(null);
  }

  async function deleteEntry(entry: PnlEntry) {
    if (!confirm(`Delete P&L entry for ${format(new Date(entry.date), "yyyy-MM-dd")}?`)) return;

    const res = await fetch(`/api/pnl/daily?date=${format(new Date(entry.date), "yyyy-MM-dd")}`, {
      method: "DELETE",
    });

    if (!res.ok) return alert("Failed to delete");

    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
  }

  function toggleSort(field: "date" | "realized") {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium">All Daily P&L Entries</div>
        <input
          className="border rounded-md px-2 py-1 text-sm w-64"
          placeholder="Search by date or note..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">
                <button
                  className="flex items-center gap-1 hover:text-slate-900"
                  onClick={() => toggleSort("date")}
                >
                  Date
                  {sortField === "date" && (sortDirection === "asc" ? " ↑" : " ↓")}
                </button>
              </th>
              <th className="text-right py-2 px-2">
                <button
                  className="flex items-center gap-1 hover:text-slate-900 ml-auto"
                  onClick={() => toggleSort("realized")}
                >
                  Realized
                  {sortField === "realized" && (sortDirection === "asc" ? " ↑" : " ↓")}
                </button>
              </th>
              <th className="text-right py-2 px-2">Unrealized</th>
              <th className="text-left py-2 px-2">Note</th>
              <th className="text-right py-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => {
              const isEditing = editingId === entry.id;
              const realizedNum = Number(entry.realizedPnl);
              const profit = realizedNum > 0;
              const loss = realizedNum < 0;

              return (
                <tr key={entry.id} className="border-b hover:bg-slate-50">
                  <td className="py-2 px-2">{format(new Date(entry.date), "yyyy-MM-dd")}</td>
                  <td className="py-2 px-2 text-right">
                    {isEditing ? (
                      <input
                        className="border rounded px-1 py-0.5 w-24 text-right"
                        value={editValues.realized}
                        onChange={(e) => setEditValues({ ...editValues, realized: e.target.value })}
                      />
                    ) : (
                      <span className={profit ? "text-emerald-700" : loss ? "text-red-700" : ""}>
                        {entry.realizedPnl}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {isEditing ? (
                      <input
                        className="border rounded px-1 py-0.5 w-24 text-right"
                        value={editValues.unrealized}
                        onChange={(e) => setEditValues({ ...editValues, unrealized: e.target.value })}
                      />
                    ) : (
                      entry.unrealizedPnl
                    )}
                  </td>
                  <td className="py-2 px-2">
                    {isEditing ? (
                      <input
                        className="border rounded px-1 py-0.5 w-full"
                        value={editValues.note}
                        onChange={(e) => setEditValues({ ...editValues, note: e.target.value })}
                      />
                    ) : (
                      <span className="text-slate-600">{entry.note || "—"}</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {isEditing ? (
                      <div className="flex gap-1 justify-end">
                        <button
                          className="px-2 py-0.5 text-xs border rounded hover:bg-slate-100"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                        <button
                          className="px-2 py-0.5 text-xs bg-black text-white rounded hover:bg-slate-800 disabled:opacity-50"
                          disabled={saving}
                          onClick={saveEdit}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end">
                        <button
                          className="px-2 py-0.5 text-xs text-blue-600 hover:underline"
                          onClick={() => startEdit(entry)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-2 py-0.5 text-xs text-red-600 hover:underline"
                          onClick={() => deleteEntry(entry)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-500">
                  {searchTerm ? "No entries found" : "No P&L entries yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-xs text-slate-500">
        Showing {filteredEntries.length} of {entries.length} entries
      </div>
    </div>
  );
}
