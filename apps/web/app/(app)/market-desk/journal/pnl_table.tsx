"use client";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/components/toast";
import { ExportButton } from "@/components/export/export-button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ENTRIES_PER_PAGE = 25;

type PnlEntry = {
  id: string;
  date: Date;
  realizedPnl: string;
  unrealizedPnl: string;
  totalEquity: string | null;
  note: string | null;
};

// Helper to format dates without timezone shift
function formatDateSafe(date: Date, formatStr: string = "yyyy-MM-dd"): string {
  // Convert to ISO string and take the date part to avoid timezone issues
  const isoDateStr = date instanceof Date ? date.toISOString().split('T')[0] : String(date).split('T')[0];
  return format(parseISO(isoDateStr), formatStr);
}

export function PnlTable({ initialEntries }: { initialEntries: PnlEntry[] }) {
  const [entries, setEntries] = useState<PnlEntry[]>(initialEntries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ realized: string; unrealized: string; totalEquity: string; note: string }>({ realized: "", unrealized: "", totalEquity: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"date" | "realized">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const { showToast } = useToast();

  const filteredEntries = entries
    .filter((entry) => {
      if (!searchTerm) return true;
      const dateStr = formatDateSafe(entry.date);
      const noteStr = (entry.note || "").toLowerCase();
      const search = searchTerm.toLowerCase();
      return dateStr.includes(search) || noteStr.includes(search);
    })
    .sort((a, b) => {
      const aVal = sortField === "date" ? new Date(a.date).getTime() : Number(a.realizedPnl);
      const bVal = sortField === "date" ? new Date(b.date).getTime() : Number(b.realizedPnl);
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });

  // Pagination calculations
  const totalPages = Math.ceil(filteredEntries.length / ENTRIES_PER_PAGE);
  const startIndex = (currentPage - 1) * ENTRIES_PER_PAGE;
  const endIndex = startIndex + ENTRIES_PER_PAGE;
  const paginatedEntries = filteredEntries.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  function startEdit(entry: PnlEntry) {
    setEditingId(entry.id);
    setEditValues({
      realized: entry.realizedPnl,
      unrealized: entry.unrealizedPnl,
      totalEquity: entry.totalEquity || "",
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
        date: formatDateSafe(entry.date),
        realizedPnl: editValues.realized,
        unrealizedPnl: editValues.unrealized || undefined,
        totalEquity: editValues.totalEquity || undefined,
        note: editValues.note || undefined,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      showToast("error", "Failed to save P&L entry");
      return;
    }

    // Update local state
    setEntries((prev) =>
      prev.map((e) =>
        e.id === editingId
          ? { ...e, realizedPnl: editValues.realized, unrealizedPnl: editValues.unrealized || "0", totalEquity: editValues.totalEquity || null, note: editValues.note || null }
          : e
      )
    );
    setEditingId(null);
    showToast("success", "P&L entry updated successfully");
  }

  async function deleteEntry(entry: PnlEntry) {
    if (!confirm(`Delete P&L entry for ${formatDateSafe(entry.date)}?`)) return;

    const res = await fetch(`/api/pnl/daily?date=${formatDateSafe(entry.date)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      showToast("error", "Failed to delete P&L entry");
      return;
    }

    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    showToast("success", "P&L entry deleted");
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
        <div className="font-medium text-slate-900 dark:text-slate-100">All Daily P&L Entries</div>
        <div className="flex items-center gap-2">
          <input
            className="border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-sm w-64 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            placeholder="Search by date or note..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          <ExportButton endpoint="/api/export/daily-pnl" label="Export" variant="secondary" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-slate-700">
              <th className="text-left py-2 px-2">
                <button
                  className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  onClick={() => toggleSort("date")}
                >
                  Date
                  {sortField === "date" && (sortDirection === "asc" ? " ↑" : " ↓")}
                </button>
              </th>
              <th className="text-right py-2 px-2">
                <button
                  className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 ml-auto"
                  onClick={() => toggleSort("realized")}
                >
                  Realized
                  {sortField === "realized" && (sortDirection === "asc" ? " ↑" : " ↓")}
                </button>
              </th>
              <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400">Unrealized</th>
              <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400">Total Equity</th>
              <th className="text-left py-2 px-2 text-slate-500 dark:text-slate-400">Note</th>
              <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEntries.map((entry) => {
              const isEditing = editingId === entry.id;
              const realizedNum = Number(entry.realizedPnl);
              const profit = realizedNum > 0;
              const loss = realizedNum < 0;

              return (
                <tr
                  key={entry.id}
                  className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150 cursor-pointer group"
                >
                  <td className="py-2 px-2 text-slate-900 dark:text-slate-100">{formatDateSafe(entry.date)}</td>
                  <td className="py-2 px-2 text-right">
                    {isEditing ? (
                      <input
                        className="border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 w-24 text-right bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        value={editValues.realized}
                        onChange={(e) => setEditValues({ ...editValues, realized: e.target.value })}
                      />
                    ) : (
                      <span className={profit ? "text-emerald-700 dark:text-emerald-400" : loss ? "text-red-700 dark:text-red-400" : "text-slate-900 dark:text-slate-100"}>
                        {entry.realizedPnl}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-900 dark:text-slate-100">
                    {isEditing ? (
                      <input
                        className="border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 w-24 text-right bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        value={editValues.unrealized}
                        onChange={(e) => setEditValues({ ...editValues, unrealized: e.target.value })}
                      />
                    ) : (
                      entry.unrealizedPnl
                    )}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-900 dark:text-slate-100">
                    {isEditing ? (
                      <input
                        className="border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 w-24 text-right bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        value={editValues.totalEquity}
                        onChange={(e) => setEditValues({ ...editValues, totalEquity: e.target.value })}
                      />
                    ) : (
                      entry.totalEquity || "-"
                    )}
                  </td>
                  <td className="py-2 px-2">
                    {isEditing ? (
                      <input
                        className="border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        value={editValues.note}
                        onChange={(e) => setEditValues({ ...editValues, note: e.target.value })}
                      />
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400">{entry.note || "—"}</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {isEditing ? (
                      <div className="flex gap-1 justify-end">
                        <button
                          className="px-2 py-0.5 text-xs border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                        <button
                          className="px-2 py-0.5 text-xs bg-gold-600 hover:bg-gold-700 text-white rounded disabled:opacity-50 transition-colors"
                          disabled={saving}
                          onClick={saveEdit}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end">
                        <button
                          className="px-2 py-0.5 text-xs text-gold-600 dark:text-gold-400 hover:underline"
                          onClick={() => startEdit(entry)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-2 py-0.5 text-xs text-red-600 dark:text-red-400 hover:underline"
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
                <td colSpan={6} className="py-4 text-center text-slate-500 dark:text-slate-400">
                  {searchTerm ? "No entries found" : "No P&L entries yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Showing {filteredEntries.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredEntries.length)} of {filteredEntries.length} entries
          {searchTerm && ` (filtered from ${entries.length} total)`}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
              Prev
            </button>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
