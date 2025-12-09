"use client";
import { useMemo, useState, useEffect } from "react";
import { parseCsv } from "@/lib/csv";
import { parseImportFile, detectFileFormat, type ImportFormat } from "@tiasas/core/src/import";

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
  const [detectedCols, setDetectedCols] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [expandedImport, setExpandedImport] = useState<string | null>(null);
  // hook to update detected column hint
  useDetectColumns(text, mode, setDetectedCols);

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  async function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;

    // Detect file format
    const format = detectFileFormat(f.name);
    if (!format) {
      alert("Unsupported file format. Please upload CSV, Excel (.xlsx), or JSON files.");
      return;
    }

    setFileName(f.name);
    setBusy(true);

    try {
      const csvText = await parseImportFile(f, format);
      setText(csvText);
    } catch (error: any) {
      alert(error.message);
      setFileName("");
    } finally {
      setBusy(false);
    }
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
      const imports = await fetch(`/api/bulk/imports?type=${mode === "PNL" ? "PNL" : mode === "NAV" ? "NAV_MONTHLY" : "JOURNAL"}&limit=1`).then((r) => r.json());
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
          <div className="text-sm text-slate-900 dark:text-slate-100">Type</div>
          <select className="border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="PNL">Daily P&L</option>
            <option value="JOURNAL">Journal Notes</option>
            <option value="NAV">Monthly NAV</option>
          </select>
          {(mode === "PNL" || mode === "NAV") && (
            <>
              <div className="text-sm text-slate-900 dark:text-slate-100">Conflict</div>
              <select className="border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value={strategy} onChange={(e) => setStrategy(e.target.value as any)}>
                <option value="upsert">Upsert (default)</option>
                <option value="skip">Skip existing</option>
              </select>
            </>
          )}
          <button className="ml-auto px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors" disabled={busy} onClick={undoLast}>Undo last import</button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Paste CSV (Ctrl+V or Cmd+V)</div>
            <textarea
              className="w-full h-48 border border-slate-200 dark:border-slate-700 rounded-md p-2 font-mono text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              value={text}
              onChange={(e) => { setText(e.target.value); setFileName(""); }}
              placeholder={mode === "NAV" ? "date,nav\n2025-05,265700\n2025-06,280000" : mode === "PNL" ? "date,realized,unrealized,totalEquity,note\n2025-05-31,5000,2000,385000,Good day" : "date,text,tags\n2025-05-31,Market closed early,#trading #news"}
            />
            {detectedCols && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">✓ Detected columns: {detectedCols}</div>}
            {fileName && <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">✓ File loaded: {fileName}</div>}
          </div>
          <div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">or Upload File (CSV, Excel, JSON)</div>
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={`h-48 border-2 border-dashed rounded-md flex flex-col items-center justify-center transition-colors ${isDragging
                ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
              <svg className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div className="text-slate-500 dark:text-slate-400 text-sm mb-2">
                {isDragging ? 'Drop file here' : 'Drag & drop file here'}
              </div>
              <div className="text-slate-400 dark:text-slate-500 text-xs mb-2">CSV, Excel (.xlsx), or JSON</div>
              <input
                type="file"
                id="file-upload"
                accept=".csv,.xlsx,.xls,.json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const format = detectFileFormat(f.name);
                  if (!format) {
                    alert("Unsupported file format. Please upload CSV, Excel (.xlsx), or JSON files.");
                    return;
                  }
                  setFileName(f.name);
                  setBusy(true);
                  try {
                    const csvText = await parseImportFile(f, format);
                    setText(csvText);
                  } catch (error: any) {
                    alert(error.message);
                    setFileName("");
                  } finally {
                    setBusy(false);
                  }
                  e.target.value = ""; // Reset input
                }}
              />
              <label
                htmlFor="file-upload"
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 cursor-pointer transition-colors text-sm"
              >
                Choose File
              </label>
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors" onClick={validate} disabled={busy}>Validate</button>
          <button className="px-3 py-1.5 rounded-md bg-gold-600 hover:bg-gold-700 text-white disabled:opacity-50 transition-colors" onClick={importNow} disabled={busy || !text}>Import</button>
          {busy && <div className="text-sm text-slate-600 dark:text-slate-400">Progress: {progress}%</div>}
        </div>
        {result && (
          <div className="mt-3 space-y-2">
            <div className="text-sm">
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">✓ Imported: {result.imported ?? result.created}</span>
              {" — "}
              <span className="text-slate-600 dark:text-slate-400">Skipped: {result.skipped ?? 0}</span>
              {result.errors && result.errors.length > 0 && (
                <>
                  {" — "}
                  <span className="text-red-700 dark:text-red-400 font-medium">✗ Errors: {result.errors.length}</span>
                </>
              )}
            </div>
            {result.errors && result.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-3">
                <div className="font-medium text-sm text-red-900 dark:text-red-300 mb-2">Error Details:</div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {result.errors.map((err: any, idx: number) => (
                    <div key={idx} className="text-xs text-red-800 dark:text-red-300 font-mono">
                      <span className="font-bold">Row {err.i}:</span> {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {mode === "NAV" && navPreview.length > 0 && (
        <div className="mt-3">
          <div className="font-medium mb-1 text-slate-900 dark:text-slate-100">Review Months</div>
          <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">Select which months to import. Existing months are marked and will be overwritten only if selected.</div>
          <NavPreviewTable rows={navPreview} onToggle={(i, checked) => {
            const next = [...navPreview]; next[i] = { ...next[i], selected: checked }; setNavPreview(next);
          }} />
        </div>
      )}
      <div className="card p-4">
        <div className="font-medium mb-2 text-slate-900 dark:text-slate-100">Templates</div>
        <div className="text-sm text-slate-700 dark:text-slate-300">Daily P&L: headers "date,realized,unrealized,totalEquity,note" - <a className="text-gold-600 dark:text-gold-400 underline" href="/templates/pnl_template.csv" download>Download template</a></div>
        <div className="text-sm text-slate-700 dark:text-slate-300">Monthly NAV: headers "date,nav" - <a className="text-gold-600 dark:text-gold-400 underline" href="/templates/nav_monthly_template.csv" download>Download template</a></div>
        <div className="text-sm text-slate-700 dark:text-slate-300">Journal: headers "date,text,tags" - <a className="text-gold-600 dark:text-gold-400 underline" href="/templates/journal_template.csv" download>Download template</a></div>
      </div>

      <div className="card p-4">
        <div className="font-medium mb-2 text-slate-900 dark:text-slate-100">Field Guide</div>
        {mode === "PNL" && (
          <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-slate-300 space-y-1">
            <li>Headers: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">date,realized,unrealized,totalEquity,note</code>. Required: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">date</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">realized</code>.</li>
            <li><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">totalEquity</code> is optional. If omitted, it will remain null (not zero).</li>
            <li>Strategy: <b>Upsert</b> overwrites same day; <b>Skip</b> leaves existing rows unchanged.</li>
            <li>Dates: YYYY-MM-DD (UTC). NAV is not needed here.</li>
            <li>Validate runs a dry‑run; Import writes and appears in Recent Imports.</li>
            <li>Undo restores prior values or deletes newly created rows.</li>
          </ul>
        )}
        {mode === "NAV" && (
          <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-slate-300 space-y-1">
            <li>Headers: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">date,nav</code>. Required: both.</li>
            <li>Date accepts <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">YYYY-MM</code> or full date; it's normalized to month‑end.</li>
            <li>Delimiters: comma, tab, or spaces are accepted.</li>
            <li>Only updates month‑end <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">NAV</code>; realized/unrealized are untouched.</li>
            <li>Validate is dry‑run; Import logs an entry under type <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">NAV_MONTHLY</code>.</li>
            <li>Undo reverts the NAV value or removes created rows.</li>
          </ul>
        )}
        {mode === "JOURNAL" && (
          <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-slate-300 space-y-1">
            <li>Headers: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">date,text,tags</code>. Required: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">date</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">text</code>.</li>
            <li>Creates journal notes; not trade executions.</li>
            <li>Validate is dry‑run; Import logs an entry under type <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">JOURNAL</code>.</li>
            <li>Undo deletes the created journal entries.</li>
          </ul>
        )}
      </div>

      <div className="card p-4">
        <div className="font-medium mb-2 text-slate-900 dark:text-slate-100">Recent imports</div>
        <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">Only completed Imports appear here (Validate is a dry‑run). Showing the last 5 for this type. You can Undo to roll back that batch.</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400">
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
              const errorsList = Array.isArray(s.errors) ? s.errors : [];
              const errors = errorsList.length;
              const when = imp.createdAt || imp.created_at || imp.created_at_utc || imp.created_at_local || imp.created;
              const isExpanded = expandedImport === imp.id;
              return (
                <>
                  <tr key={imp.id} className="border-t dark:border-slate-700">
                    <td className="py-1 text-slate-900 dark:text-slate-100">{new Date(when).toLocaleString()}</td>
                    <td className="text-slate-900 dark:text-slate-100">{imported}</td>
                    <td className="text-slate-900 dark:text-slate-100">{skipped}</td>
                    <td>
                      {errors > 0 ? (
                        <button
                          className="text-red-600 dark:text-red-400 hover:underline"
                          onClick={() => setExpandedImport(isExpanded ? null : imp.id)}
                        >
                          {errors} {isExpanded ? '▼' : '▶'}
                        </button>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">0</span>
                      )}
                    </td>
                    <td><button className="text-gold-600 dark:text-gold-400 hover:underline" disabled={busy} onClick={() => undo(imp.id)}>Undo</button></td>
                  </tr>
                  {isExpanded && errors > 0 && (
                    <tr key={`${imp.id}-errors`} className="border-t dark:border-slate-700 bg-red-50 dark:bg-red-950/30">
                      <td colSpan={5} className="py-2 px-3">
                        <div className="text-xs text-red-900 dark:text-red-300 font-medium mb-1">Error Details:</div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {errorsList.map((err: any, idx: number) => (
                            <div key={idx} className="text-xs text-red-800 dark:text-red-300 font-mono">
                              <span className="font-bold">Row {err.i}:</span> {err.error}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {imports.length === 0 && (
              <tr><td className="py-2 text-slate-500 dark:text-slate-400" colSpan={5}>No imports yet.</td></tr>
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
          <tr className="text-left text-slate-500 dark:text-slate-400">
            <th className="py-1">Use</th>
            <th>Month-End</th>
            <th>NAV</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {display.map((r, idx) => (
            <tr key={`${r.date}-${idx}`} className="border-t dark:border-slate-700">
              <td className="py-1"><input type="checkbox" checked={!!r.selected} onChange={(e) => onToggle(idx, e.target.checked)} /></td>
              <td className="text-slate-900 dark:text-slate-100">{r.date}</td>
              <td className="text-slate-900 dark:text-slate-100">{r.nav}</td>
              <td className={r.exists ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}>{r.exists ? `Replace (was ${r.existingNav ?? '-'})` : "New"}</td>
            </tr>
          ))}
          {!showAll && (
            <tr className="border-t dark:border-slate-700 text-slate-500 dark:text-slate-400"><td colSpan={4} className="py-2">Showing first {MAX} of {rows.length} months… refine your paste to a smaller range if needed.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Detect and display how we'll interpret the first pasted line
function useDetectColumns(text: string, mode: "PNL" | "JOURNAL" | "NAV", setDetected: (s: string) => void) {
  const [last, setLast] = useState<string>("");
  useEffect(() => {
    if (text === last) return;
    setLast(text);
    const rows = parseCsv(text || "");
    if (rows.length === 0) { setDetected(""); return; }
    const parts = rows[0] ?? [];
    const lower = parts.map(s => s.toLowerCase());
    const has = (name: string) => lower.includes(name);
    const header = has('date') && (mode === 'NAV' ? has('nav') : mode === 'PNL' ? has('realized') : has('text'));
    if (header) { setDetected(lower.join(', ')); return; }
    if (mode === 'NAV') {
      setDetected(parts.length >= 2 ? 'date, nav' : 'date, nav (need 2 columns)');
      return;
    }
    if (mode === 'PNL') {
      const cols = ['date', 'realized'];
      if (parts.length >= 3) cols.push('unrealized');
      if (parts.length >= 4) cols.push('totalEquity');
      if (parts.length >= 5) cols.push('note');
      setDetected(cols.join(', '));
      return;
    }
    if (mode === 'JOURNAL') {
      setDetected(parts.length >= 2 ? (parts.length >= 3 ? 'date, text, tags' : 'date, text') : 'date, text');
      return;
    }
    setDetected("");
  }, [text, mode]);
}
