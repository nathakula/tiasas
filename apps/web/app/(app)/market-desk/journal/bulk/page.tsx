"use client";
import { useMemo, useState } from "react";

type Mode = "PNL" | "JOURNAL";

export default function BulkUploadPage() {
  const [mode, setMode] = useState<Mode>("PNL");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [strategy, setStrategy] = useState<"upsert" | "skip">("upsert");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any | null>(null);

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    f.text().then((t) => setText(t));
  }

  async function validate() {
    setBusy(true); setErrors([]); setRows([]); setResult(null);
    try {
      const payload = { text, dryRun: true, ...(mode === "PNL" ? { strategy } : {}) };
      const url = mode === "PNL" ? "/api/pnl/bulk" : "/api/journal/bulk";
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Validate failed");
      setResult(data);
    } catch (e: any) {
      alert(e.message);
    } finally { setBusy(false); }
  }

  async function importNow() {
    setBusy(true); setProgress(0); setResult(null);
    try {
      const payload = { text, ...(mode === "PNL" ? { strategy } : {}) };
      const url = mode === "PNL" ? "/api/pnl/bulk" : "/api/journal/bulk";
      // chunking client side for smoother progress
      const parts = text.split(/\r?\n/);
      const header = parts.shift();
      const chunkSize = 1000;
      let imported = 0, skipped = 0, errors: any[] = [];
      for (let i = 0; i < parts.length; i += chunkSize) {
        const chunk = [header, ...parts.slice(i, i + chunkSize)].join("\n");
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: chunk, strategy }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Import failed");
        imported += data.imported ?? data.created ?? 0;
        skipped += data.skipped ?? 0;
        if (Array.isArray(data.errors)) errors = errors.concat(data.errors);
        setProgress(Math.round(((i + chunkSize) / parts.length) * 100));
      }
      setResult({ imported, skipped, errors });
    } catch (e: any) {
      alert(e.message);
    } finally { setBusy(false); setProgress(100); }
  }

  async function undoLast() {
    setBusy(true); setResult(null);
    try {
      const imports = await fetch(`/api/bulk/imports?type=${mode === "PNL" ? "PNL" : "JOURNAL"}&limit=1`).then((r)=>r.json());
      const last = imports.imports?.[0];
      if (!last) { alert("No recent import found"); return; }
      const res = await fetch("/api/bulk/undo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ importId: last.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Undo failed");
      alert("Undo successful");
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-sm">Type</div>
          <select className="border rounded-md px-2 py-1" value={mode} onChange={(e)=>setMode(e.target.value as Mode)}>
            <option value="PNL">Daily P&L</option>
            <option value="JOURNAL">Journal Notes</option>
          </select>
          {mode === "PNL" && (
            <>
              <div className="text-sm">Conflict</div>
              <select className="border rounded-md px-2 py-1" value={strategy} onChange={(e)=>setStrategy(e.target.value as any)}>
                <option value="upsert">Upsert (default)</option>
                <option value="skip">Skip existing</option>
              </select>
            </>
          )}
          <button className="ml-auto px-2 py-1 border rounded-md" disabled={busy} onClick={undoLast}>Undo last import</button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-slate-600 mb-1">Paste CSV</div>
            <textarea className="w-full h-48 border rounded-md p-2 font-mono text-xs" value={text} onChange={(e)=>setText(e.target.value)} placeholder="date,realized,unrealized,nav,note" />
          </div>
          <div>
            <div className="text-sm text-slate-600 mb-1">or Drag & Drop .csv</div>
            <div onDrop={onDrop} onDragOver={(e)=>e.preventDefault()} className="h-48 border-dashed border rounded-md flex items-center justify-center text-slate-500">
              Drop file here
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="px-3 py-1.5 rounded-md border" onClick={validate} disabled={busy}>Validate</button>
          <button className="px-3 py-1.5 rounded-md bg-black text-white disabled:opacity-50" onClick={importNow} disabled={busy || !text}>Import</button>
          {busy && <div className="text-sm text-slate-600">Progress: {progress}%</div>}
        </div>
        {result && (
          <div className="mt-3 text-sm">
            <div>Imported: {result.imported ?? result.created} — Skipped: {result.skipped ?? 0} — Errors: {result.errors?.length ?? 0}</div>
          </div>
        )}
      </div>
      <div className="card p-4">
        <div className="font-medium mb-2">Templates</div>
        <div className="text-sm">Daily P&L: headers "date,realized,unrealized,nav,note" — <a className="text-blue-600 underline" href="/templates/pnl_template.csv" download>Download template</a></div>
        <div className="text-sm">Journal: headers "date,text,tags" — <a className="text-blue-600 underline" href="/templates/journal_template.csv" download>Download template</a></div>
      </div>
    </div>
  );
}
