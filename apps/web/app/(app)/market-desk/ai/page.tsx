"use client";
import { useState } from "react";

type Tab = "quick"|"deep"|"macro"|"notes";

export default function AIPage() {
  const [tab, setTab] = useState<Tab>("quick");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button className={`px-2 py-1 border rounded ${tab==='quick'?'bg-black text-white':''}`} onClick={()=>setTab('quick')}>Quick Scan</button>
        <button className={`px-2 py-1 border rounded ${tab==='deep'?'bg-black text-white':''}`} onClick={()=>setTab('deep')}>Deep Dive</button>
        <button className={`px-2 py-1 border rounded ${tab==='macro'?'bg-black text-white':''}`} onClick={()=>setTab('macro')}>Macro</button>
        <button className={`px-2 py-1 border rounded ${tab==='notes'?'bg-black text-white':''}`} onClick={()=>setTab('notes')}>Notes → Actions</button>
      </div>
      {tab==='quick' && <QuickScan />}
      {tab==='deep' && <DeepDive />}
      {tab==='macro' && <MacroBox />}
      {tab==='notes' && <NotesActions />}
      <div className="text-xs text-slate-500">AI outputs are informational only. Not investment advice.</div>
    </div>
  );
}

function QuickScan() {
  const [ticker, setTicker] = useState("");
  const [window, setWindow] = useState("3m");
  const [res, setRes] = useState<any | null>(null);
  async function run() {
    const r = await fetch('/api/ai/quick-scan', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ticker, window })});
    setRes(await r.json());
  }
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <input className="border rounded px-2 py-1" placeholder="Ticker" value={ticker} onChange={(e)=>setTicker(e.target.value.toUpperCase())} />
        <select className="border rounded px-2 py-1" value={window} onChange={(e)=>setWindow(e.target.value)}>
          <option value="1m">1m</option>
          <option value="3m">3m</option>
          <option value="6m">6m</option>
          <option value="1y">1y</option>
        </select>
        <button className="px-3 py-1.5 rounded bg-black text-white" onClick={run}>Scan</button>
      </div>
      {res && <pre className="text-xs bg-slate-50 p-2 rounded overflow-auto">{JSON.stringify(res, null, 2)}</pre>}
    </div>
  );
}

function DeepDive() {
  const [ticker, setTicker] = useState("");
  const [focus, setFocus] = useState("");
  const [res, setRes] = useState<any | null>(null);
  async function run() {
    const r = await fetch('/api/ai/deep-dive', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ticker, focus: focus || undefined })});
    setRes(await r.json());
  }
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <input className="border rounded px-2 py-1" placeholder="Ticker" value={ticker} onChange={(e)=>setTicker(e.target.value.toUpperCase())} />
        <input className="border rounded px-2 py-1" placeholder="Focus (optional)" value={focus} onChange={(e)=>setFocus(e.target.value)} />
        <button className="px-3 py-1.5 rounded bg-black text-white" onClick={run}>Deep Dive</button>
      </div>
      {res && <pre className="text-xs bg-slate-50 p-2 rounded overflow-auto">{JSON.stringify(res, null, 2)}</pre>}
    </div>
  );
}

function MacroBox() {
  const [watchlist, setWatchlist] = useState("SPY,QQQ");
  const [res, setRes] = useState<any | null>(null);
  async function run() {
    const wl = watchlist.split(',').map(s=>s.trim()).filter(Boolean);
    const r = await fetch('/api/ai/macro', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ watchlist: wl })});
    setRes(await r.json());
  }
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <input className="border rounded px-2 py-1" placeholder="Watchlist" value={watchlist} onChange={(e)=>setWatchlist(e.target.value)} />
        <button className="px-3 py-1.5 rounded bg-black text-white" onClick={run}>Generate</button>
      </div>
      {res && <pre className="text-xs bg-slate-50 p-2 rounded overflow-auto">{JSON.stringify(res, null, 2)}</pre>}
    </div>
  );
}

function NotesActions() {
  const [id, setId] = useState("");
  const [res, setRes] = useState<any | null>(null);
  async function run() {
    const r = await fetch('/api/ai/notes-to-actions', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ journalEntryId: id })});
    setRes(await r.json());
  }
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <input className="border rounded px-2 py-1" placeholder="Journal entry id" value={id} onChange={(e)=>setId(e.target.value)} />
        <button className="px-3 py-1.5 rounded bg-black text-white" onClick={run}>Convert</button>
      </div>
      {res && <pre className="text-xs bg-slate-50 p-2 rounded overflow-auto">{JSON.stringify(res, null, 2)}</pre>}
    </div>
  );
}

