"use client";
import { useMemo, useState, useEffect } from "react";

type Mode = "PNL" | "JOURNAL" | "NAV";

export default function BulkUploadPage() {
  const [mode, setMode] = useState<Mode>("PNL");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [strategy, setStrategy] = useState<"upsert" | "skip">("upsert");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any | null>(null);
  const [imports, setImports] = useState<any[]>([]);
  const [navPreview, setNavPreview] = useState<{ i: number; inputDate: string; date: string; nav: string; exists?: boolean; existingNav?: string | null; selected?: boolean }[]>([]);

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    f.text().then((t) => setText(t));
  }

  async function validate() {
    setBusy(true); setErrors([]); setRows([]); setResult(null);
    try {
      const payload = { text, dryRun: true, ...(mode === "PNL" || mode === "NAV" ? { strategy } : {}) } as any;
      const url = mode === "PNL" ? "/api/pnl/bulk" : (mode === "NAV" ? "/api/nav/monthly/bulk" : "/api/journal/bulk");
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Validate failed");
      setResult(data);
      if (mode === "NAV") {
        const preview = Array.isArray(data.preview) ? data.preview.map((r: any) => ({ ...r, selected: true })) : [];
        setNavPreview(preview);
      }
    } catch (e: any) {
      alert(e.message);
    } finally { setBusy(false); }
  }

  async function importNow() {
    setBusy(true); setProgress(0); setResult(null);
    try {
      let payload: any = { text };
      let url = mode === "PNL" ? "/api/pnl/bulk" : (mode === "NAV" ? "/api/nav/monthly/bulk" : "/api/journal/bulk");
      if (mode === "PNL") payload.strategy = strategy;
      if (mode === "NAV") {
        const selected = navPreview.filter((r) => r.selected);
        if (selected.length === 0) throw new Error("No rows selected");
        const anyConflict = selected.some((r) => r.exists);
        if (anyConflict && !confirm("Replace NAV for selected months that already exist? This will overwrite those values.")) {
          setBusy(false); return;
        }
        const csv = ["date,nav", ...selected.map((r) => `${r.date},${r.nav}`)].join("\n");
        payload = { text: csv, strategy };
      }
      // chunking client side for smoother progress
      const parts = text.split(/\r?\n/);
      const header = parts.shift();
      const chunkSize = 1000;
      let imported = 0, skipped = 0, errors: any[] = [];
      if (mode === "NAV" && navPreview.length > 0) {
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Import failed");
        imported += data.imported ?? 0; skipped += data.skipped ?? 0; if (Array.isArray(data.errors)) errors = errors.concat(data.errors);
      } else {
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
      }
      setResult({ imported, skipped, errors });
      await refreshImports();
    } catch (e: any) {
      alert(e.message);
    } finally { setBusy(false); setProgress(100); }
  }

  async function undoLast() {
    setBusy(true); setResult(null);
    try {
      const imports = await fetch(`/api/bulk/imports?type=${mode === "PNL" ? "PNL" : mode === "NAV" ? "NAV_MONTHLY" : "JOURNAL"}&limit=1`).then((r)=>r.json());
      const last = imports.imports?.[0];
      if (!last) { alert("No recent import found"); return; }
      const res = await fetch("/api/bulk/undo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ importId: last.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Undo failed");
      alert("Undo successful");
      await refreshImports();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  async function undo(id: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/bulk/undo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ importId: id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Undo failed");
      await refreshImports();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  async function refreshImports() {
    try {
      const type = mode === "PNL" ? "PNL" : mode === "NAV" ? "NAV_MONTHLY" : "JOURNAL";
      const res = await fetch(`/api/bulk/imports?type=${type}&limit=5`);
      const data = await res.json();
      setImports(data.imports ?? []);
    } catch { setImports([]); }
  }

  // Load recent imports on mount and whenever the mode changes
  useEffect(() => { refreshImports(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mode]);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-sm">Type</div>
          <select className="border rounded-md px-2 py-1" value={mode} onChange={(e)=>setMode(e.target.value as Mode)}>
            <option value="PNL">Daily P&L</option>
            <option value="JOURNAL">Journal Notes</option>
            <option value="NAV">Monthly NAV</option>
          </select>
          {(mode === "PNL" || mode === "NAV") && (
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
          <textarea className="w-full h-48 border rounded-md p-2 font-mono text-xs" value={text} onChange={(e)=>setText(e.target.value)} placeholder={mode === "NAV" ? "date,nav (YYYY-MM or MM/DD/YYYY)" : mode === "PNL" ? "date,realized,unrealized,note" : "date,text,tags"} />
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
      {mode === "NAV" && navPreview.length > 0 && (
        <div className="mt-3">
          <div className="font-medium mb-1">Review Months</div>
          <div className="text-xs text-slate-600 mb-2">Select which months to import. Existing months are marked and will be overwritten only if selected.</div>
          <NavPreviewTable rows={navPreview} onToggle={(i, checked) => {
            const next = [...navPreview]; next[i] = { ...next[i], selected: checked }; setNavPreview(next);
          }} />
        </div>
      )}
      <div className="card p-4">
        <div className="font-medium mb-2">Templates</div>
        <div className="text-sm">Daily P&L: headers "date,realized,unrealized,note" - <a className="text-blue-600 underline" href="/templates/pnl_template.csv" download>Download template</a></div>
        <div className="text-sm">Monthly NAV: headers "date,nav" - <a className="text-blue-600 underline" href="/templates/nav_monthly_template.csv" download>Download template</a></div>
        <div className="text-sm">Journal: headers "date,text,tags" - <a className="text-blue-600 underline" href="/templates/journal_template.csv" download>Download template</a></div>
      </div>

      <div className="card p-4">
        <div className="font-medium mb-2">Field Guide</div>
        {mode === "PNL" && (
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>Headers: <code>date,realized,unrealized,note</code>. Required: <code>date</code>, <code>realized</code>.</li>
            <li>Strategy: <b>Upsert</b> overwrites same day; <b>Skip</b> leaves existing rows unchanged.</li>
            <li>Dates: YYYY-MM-DD (UTC). NAV is not needed here.</li>
            <li>Validate runs a dry‑run; Import writes and appears in Recent Imports.</li>
            <li>Undo restores prior values or deletes newly created rows.</li>
          </ul>
        )}
        {mode === "NAV" && (
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>Headers: <code>date,nav</code>. Required: both.</li>
            <li>Date accepts <code>YYYY-MM</code> or full date; it’s normalized to month‑end.</li>
            <li>Delimiters: comma, tab, or spaces are accepted.</li>
            <li>Only updates month‑end <code>NAV</code>; realized/unrealized are untouched.</li>
            <li>Validate is dry‑run; Import logs an entry under type <code>NAV_MONTHLY</code>.</li>
            <li>Undo reverts the NAV value or removes created rows.</li>
          </ul>
        )}
        {mode === "JOURNAL" && (
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>Headers: <code>date,text,tags</code>. Required: <code>date</code>, <code>text</code>.</li>
            <li>Creates journal notes; not trade executions.</li>
            <li>Validate is dry‑run; Import logs an entry under type <code>JOURNAL</code>.</li>
            <li>Undo deletes the created journal entries.</li>
          </ul>
        )}
      </div>

      <div className="card p-4">
        <div className="font-medium mb-2">Recent imports</div>
        <div className="text-xs text-slate-600 mb-2">Only completed Imports appear here (Validate is a dry‑run). Showing the last 5 for this type. You can Undo to roll back that batch.</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1">When</th>
              <th>Imported</th>
              <th>Skipped</th>
              <th>Errors</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {imports.map((imp) => {
              const s = imp.summary || {};
              const imported = s.imported ?? s.created ?? 0;
              const skipped = s.skipped ?? 0;
              const errors = Array.isArray(s.errors) ? s.errors.length : 0;
              const when = imp.createdAt || imp.created_at || imp.created_at_utc || imp.created_at_local || imp.created;
              return (
                <tr key={imp.id} className="border-t">
                  <td className="py-1">{new Date(when).toLocaleString()}</td>
                  <td>{imported}</td>
                  <td>{skipped}</td>
                  <td>{errors}</td>
                  <td><button className="text-blue-600" disabled={busy} onClick={() => undo(imp.id)}>Undo</button></td>
                </tr>
              );
            })}
            {imports.length === 0 && (
              <tr><td className="py-2 text-slate-500" colSpan={5}>No imports yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NavPreviewTable({ rows, onToggle }: { rows: { date: string; nav: string; exists?: boolean; existingNav?: string | null; selected?: boolean }[]; onToggle: (index: number, checked: boolean) => void }) {
  const MAX = 200;
  const showAll = rows.length <= MAX;
  const display = showAll ? rows : rows.slice(0, MAX);
  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-1">Use</th>
            <th>Month-End</th>
            <th>NAV</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {display.map((r, idx) => (
            <tr key={`${r.date}-${idx}`} className="border-t">
              <td className="py-1"><input type="checkbox" checked={!!r.selected} onChange={(e)=>onToggle(idx, e.target.checked)} /></td>
              <td>{r.date}</td>
              <td>{r.nav}</td>
              <td className={r.exists ? "text-amber-700" : "text-emerald-700"}>{r.exists ? `Replace (was ${r.existingNav ?? '-'})` : "New"}</td>
            </tr>
          ))}
          {!showAll && (
            <tr className="border-t text-slate-500"><td colSpan={4} className="py-2">Showing first {MAX} of {rows.length} months… refine your paste to a smaller range if needed.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
