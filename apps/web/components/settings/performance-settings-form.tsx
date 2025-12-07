
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/toast";
import { Save, Loader2, DollarSign, Plus, Trash2, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { format } from "date-fns";

interface PerformanceSettings_Data {
    year: number;
    startingCapital: number;
    benchmarks: string[];
}

interface Transfer {
    id: string;
    date: string;
    amount: string;
    type: "DEPOSIT" | "WITHDRAWAL";
    note?: string;
}

export function PerformanceSettingsForm() {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState<PerformanceSettings_Data | null>(null);

    // Transfers state
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [loadingTransfers, setLoadingTransfers] = useState(false);
    const [newTransfer, setNewTransfer] = useState<{ date: string; amount: string; type: "DEPOSIT" | "WITHDRAWAL"; note: string }>({
        date: new Date().toISOString().split('T')[0],
        amount: "",
        type: "DEPOSIT",
        note: ""
    });
    const [isAddingTransfer, setIsAddingTransfer] = useState(false);

    const { showToast } = useToast();

    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let y = 2023; y <= currentYear + 1; y++) {
        yearOptions.push(y);
    }

    // Fetch settings AND transfers when year changes
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                // Fetch Settings
                const resSettings = await fetch(`/api/settings/performance?year=${selectedYear}`);
                if (resSettings.ok) {
                    const json = await resSettings.json();
                    setData(json);
                } else {
                    setData({ year: selectedYear, startingCapital: 0, benchmarks: ["SPY", "QQQ"] });
                }

                // Fetch Transfers
                setLoadingTransfers(true);
                const resTransfers = await fetch(`/api/settings/transfers?year=${selectedYear}`);
                if (resTransfers.ok) {
                    const jsonTransfers = await resTransfers.json();
                    setTransfers(jsonTransfers);
                }

            } catch (err) {
                console.error(err);
                showToast("error", "Failed to load data");
            } finally {
                setLoading(false);
                setLoadingTransfers(false);
            }
        }
        fetchData();
    }, [selectedYear]);

    async function handleSaveSettings() {
        if (!data) return;
        setSaving(true);
        try {
            const res = await fetch("/api/settings/performance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    year: selectedYear,
                    startingCapital: data.startingCapital,
                    benchmarks: data.benchmarks,
                }),
            });

            if (!res.ok) throw new Error("Failed to save");

            showToast("success", "Performance settings saved");
        } catch (err) {
            console.error(err);
            showToast("error", "Failed to save settings");
        } finally {
            setSaving(false);
        }
    }

    async function handleAddTransfer() {
        if (!newTransfer.amount || parseFloat(newTransfer.amount) <= 0) return alert("Enter a valid amount");

        try {
            const res = await fetch("/api/settings/transfers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...newTransfer,
                    date: new Date(newTransfer.date).toISOString(), // ensure ISO
                    amount: parseFloat(newTransfer.amount)
                })
            });

            if (!res.ok) throw new Error("Failed to add transfer");

            const saved = await res.json();
            setTransfers(prev => [...prev, saved].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
            setNewTransfer({ date: new Date().toISOString().split('T')[0], amount: "", type: "DEPOSIT", note: "" }); // Reset
            setIsAddingTransfer(false);
            showToast("success", "Transfer recorded");
        } catch (e) {
            console.error(e);
            showToast("error", "Could not save transfer");
        }
    }

    async function handleDeleteTransfer(id: string) {
        if (!confirm("Remove this capital transfer?")) return;
        try {
            const res = await fetch(`/api/settings/transfers?id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
            setTransfers(prev => prev.filter(t => t.id !== id));
            showToast("success", "Transfer removed");
        } catch (e) {
            console.error(e);
            showToast("error", "Deleting failed");
        }
    }

    if (loading && !data) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
            </div>
        );
    }

    return (
        <div className="card p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Performance Configuration
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Set your starting capital and manage deposits/withdrawals for accurate returns.
                    </p>
                </div>
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100"
                >
                    {yearOptions.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            {/* Starting Capital Section */}
            <div className="space-y-4 max-w-md border-b border-slate-200 dark:border-slate-700 pb-8">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Starting Capital (Jan 1, {selectedYear})
                    </label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={data?.startingCapital || 0}
                            onChange={(e) => setData(prev => prev ? ({ ...prev, startingCapital: parseFloat(e.target.value) || 0 }) : null)}
                            className="pl-9 w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Funds available at the very beginning of the year.
                    </p>
                </div>

                <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Starting Capital
                </button>
            </div>

            {/* Capital Transfers Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-slate-900 dark:text-slate-100">
                        Capital Transfers ({selectedYear})
                    </h3>
                    <button
                        onClick={() => setIsAddingTransfer(!isAddingTransfer)}
                        className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        <Plus className="w-4 h-4" />
                        Add Transfer
                    </button>
                </div>

                {isAddingTransfer && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg mb-4 border border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                                <input
                                    type="date"
                                    className="w-full text-sm rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                                    value={newTransfer.date}
                                    onChange={(e) => setNewTransfer({ ...newTransfer, date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Amount</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full text-sm rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                                    value={newTransfer.amount}
                                    onChange={(e) => setNewTransfer({ ...newTransfer, amount: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                                <select
                                    className="w-full text-sm rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                                    value={newTransfer.type}
                                    onChange={(e) => setNewTransfer({ ...newTransfer, type: e.target.value as any })}
                                >
                                    <option value="DEPOSIT">Deposit (Inflow)</option>
                                    <option value="WITHDRAWAL">Withdrawal (Outflow)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Note (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Bank Transfer"
                                    className="w-full text-sm rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                                    value={newTransfer.note}
                                    onChange={(e) => setNewTransfer({ ...newTransfer, note: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setIsAddingTransfer(false)}
                                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddTransfer}
                                className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium"
                            >
                                Record Transfer
                            </button>
                        </div>
                    </div>
                )}

                {transfers.length === 0 ? (
                    <div className="text-center py-6 text-sm text-slate-500 dark:text-slate-400 italic">
                        No deposits or withdrawals recorded for {selectedYear}.
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium text-slate-500">Date</th>
                                    <th className="px-3 py-2 text-left font-medium text-slate-500">Type</th>
                                    <th className="px-3 py-2 text-right font-medium text-slate-500">Amount</th>
                                    <th className="px-3 py-2 text-left font-medium text-slate-500">Note</th>
                                    <th className="px-3 py-2 text-right font-medium text-slate-500">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {transfers.map((t) => (
                                    <tr key={t.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                                            {format(new Date(t.date), "MMM d, yyyy")}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${t.type === 'DEPOSIT'
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                                                }`}>
                                                {t.type === 'DEPOSIT' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                                {t.type}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-slate-900 dark:text-slate-100">
                                            ${Number(t.amount).toLocaleString()}
                                        </td>
                                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400 text-xs">
                                            {t.note || "—"}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <button
                                                onClick={() => handleDeleteTransfer(t.id)}
                                                className="text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
}
