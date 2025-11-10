"use client";
import { useMemo, useState } from "react";

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
      {res && <QuickScanView data={res} />}
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
      {res && <DeepDiveView data={res} />}
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
      {res && <MacroView data={res} />}
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
      {res && <TasksView items={res} />}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos"|"neg" }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-semibold ${tone==='pos'? 'text-emerald-700': tone==='neg'?'text-red-700':''}`}>{value}</div>
    </div>
  );
}

function PriceList({ title, items }: { title: string; items: any[] }) {
  function toPrice(item: any): { price?: number; label?: string } {
    if (item == null) return {};
    if (typeof item === 'number') return { price: item };
    const d: any = item;
    const price = d.price ?? d.level ?? d.entryLevel ?? d.exitLevel ?? d.value ?? undefined;
    const label = d.note ?? d.description ?? d.reason ?? d.label ?? undefined;
    return { price: (typeof price === 'number' ? price : Number(price)), label };
  }
  return (
    <div className="card p-3">
      <div className="text-sm font-medium mb-1">{title}</div>
      <ul className="text-sm space-y-1">
        {(Array.isArray(items) ? items : items ? [items] : []).map((it, i) => {
          const p = toPrice(it);
          const priceText = (p.price != null && !Number.isNaN(p.price)) ? `$${Number(p.price).toFixed(2)}` : '-';
          const label = p.label ?? '';
          return <li key={i} className="flex justify-between"><span>{label}</span><span>{priceText}</span></li>;
        })}
        {!items?.length && <li className="text-slate-500">-</li>}
      </ul>
    </div>
  );
}

function ListBox({ title, items }: { title: string; items: any }) {
  function fmt(item: any): string {
    if (item == null) return "";
    if (typeof item === "string") return item;
    if (typeof item === "number" || typeof item === "boolean") return String(item);
    // Try common fields from LLMs
    const d = (item as any);
    const parts: string[] = [];
    if (d.description) parts.push(String(d.description));
    if (d.text && parts.length === 0) parts.push(String(d.text));
    const level = d.level ?? d.entryLevel ?? d.exitLevel ?? d.price;
    if (level != null) parts.push(`@ ${level}`);
    const note = d.note ?? d.reason;
    if (note && parts.length === 0) parts.push(String(note));
    if (parts.length > 0) return parts.join(" ");
    try { return JSON.stringify(d); } catch { return String(d); }
  }
  return (
    <div className="card p-3">
      <div className="text-sm font-medium mb-1">{title}</div>
      <ul className="list-disc list-inside text-sm space-y-1">
        {(Array.isArray(items) ? items : items ? [items] : []).map((t, i) => <li key={i}>{fmt(t)}</li>)}
        {!items?.length && <li className="text-slate-500">-</li>}
      </ul>
    </div>
  );
}

function Table({ rows, cols }: { rows: any; cols: { key: string; label: string }[] }) {
  const arr: any[] = Array.isArray(rows)
    ? rows
    : (rows && typeof rows === 'object')
      ? Object.entries(rows).map(([k, v]) => ({ key: k, value: v }))
      : [];
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-slate-500">
          {cols.map((c) => <th key={c.key} className="py-1 pr-2">{c.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {arr.map((r, i) => (
          <tr key={i} className="border-t">
            {cols.map((c) => <td key={c.key} className="py-1 pr-2">{String(r[c.key] ?? '')}</td>)}
          </tr>
        ))}
        {arr.length===0 && <tr><td className="py-2 text-slate-500" colSpan={cols.length}>No data</td></tr>}
      </tbody>
    </table>
  );
}

function QuickScanView({ data }: { data: any }) {
  const trendTone = data?.trend === 'up' ? 'pos' : data?.trend === 'down' ? 'neg' : undefined;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">{data.ticker} · window {data.window}</div>
      </div>
      <div className="grid md:grid-cols-5 gap-3 items-start">
        <Stat label="Trend" value={String(data.trend ?? '-')} tone={trendTone as any} />
        <Stat label="Supports" value={String(data.supports?.length ?? 0)} />
        <Stat label="Resistances" value={String(data.resistances?.length ?? 0)} />
        <Stat label="Ideas" value={`${(data.entryIdeas?.length ?? 0)+(data.exitIdeas?.length ?? 0)}`} />
        <Stat label="Catalysts" value={String(data.catalysts?.length ?? 0)} />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <PriceList title="Support Levels" items={data.supports ?? []} />
        <PriceList title="Resistance Levels" items={data.resistances ?? []} />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <ListBox title="Entry Ideas" items={data.entryIdeas ?? []} />
        <ListBox title="Exit Ideas" items={data.exitIdeas ?? []} />
      </div>
      <div className="card p-3">
        <div className="text-sm font-medium mb-1">Ranges</div>
        <Table rows={data.ranges ?? []} cols={[{key:'period',label:'Period'},{key:'chgPct',label:'Chg %'},{key:'high',label:'High'},{key:'low',label:'Low'},{key:'atr',label:'ATR'}]} />
      </div>
      <div className="card p-3">
        <div className="text-sm font-medium mb-1">Catalysts</div>
        <Table rows={(data.catalysts ?? []).map((c:any)=>({date:c.date,label:c.label}))} cols={[{key:'date',label:'Date'},{key:'label',label:'Label'}]} />
      </div>
      {data.macroNote && <div className="text-sm text-slate-700">{data.macroNote}</div>}
      <div className="text-xs text-slate-500">{data.disclaimer}</div>
    </div>
  );
}

function DeepDiveView({ data }: { data: any }) {
  const supports = data?.technicalZones?.supports ?? [];
  const resistances = data?.technicalZones?.resistances ?? [];
  const momentum = data?.technicalZones?.momentumNote;
  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-600">{data.ticker}</div>
      <div className="card p-3"><div className="font-medium">Overview</div><p className="text-sm mt-1 whitespace-pre-wrap">{typeof data.overview === 'string' ? data.overview : (()=>{ try { return JSON.stringify(data.overview); } catch { return String(data.overview); } })()}</p></div>
      <div className="card p-3"><div className="font-medium">Recent Results</div>
        {Array.isArray(data.recentResults) ? (
          <ul className="list-disc list-inside text-sm space-y-1 mt-1">{data.recentResults.map((x:any,i:number)=>(<li key={i}>{typeof x==='string'?x:JSON.stringify(x)}</li>))}</ul>
        ) : (
          <p className="text-sm mt-1 whitespace-pre-wrap">{String(data.recentResults ?? '')}</p>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <PriceList title="Supports" items={supports} />
        <PriceList title="Resistances" items={resistances} />
      </div>
      {momentum && <div className="text-sm text-slate-700">{momentum}</div>}
      <div className="card p-3"><div className="font-medium">Valuation</div><p className="text-sm mt-1 whitespace-pre-wrap">{typeof data.valuationContext === 'string' ? data.valuationContext : (()=>{ try { return JSON.stringify(data.valuationContext); } catch { return String(data.valuationContext); } })()}</p></div>
      {Array.isArray(data.comps) && data.comps.length>0 && (
        <div className="card p-3">
          <div className="font-medium mb-1">Comps</div>
          <div className="flex flex-wrap gap-2">{data.comps.map((c:any,i:number)=>(<span key={i} className="px-2 py-0.5 text-xs border rounded">{typeof c==='string'?c:JSON.stringify(c)}</span>))}</div>
        </div>
      )}
      <div className="grid md:grid-cols-3 gap-3">
        <ListBox title="Risks" items={data.risks ?? []} />
        <ListBox title="Alternative Cases" items={data.alternativeCases ?? []} />
        <ListBox title="Checklist" items={data.checklist ?? []} />
      </div>
      <div className="text-xs text-slate-500">{data.disclaimer}</div>
    </div>
  );
}

function MacroView({ data }: { data: any }) {
  const week = data?.weekAhead ?? [];
  return (
    <div className="space-y-3">
      <div className="card p-3"><div className="font-medium">Summary</div><p className="text-sm mt-1 whitespace-pre-wrap">{data.summary}</p></div>
      <div className="card p-3">
        <div className="font-medium mb-1">Week Ahead</div>
        <Table rows={week} cols={[{key:'date',label:'Date'},{key:'item',label:'Item'}]} />
      </div>
      <ListBox title="Watchouts" items={data.watchouts ?? []} />
      <div className="text-xs text-slate-500">{data.disclaimer}</div>
    </div>
  );
}

function TasksView({ items }: { items: any }) {
  const groups = useMemo(() => {
    const g: Record<string, string[]> = { today: [], this_week: [], this_month: [] } as any;
    const list: any[] = Array.isArray(items) ? items : [];
    list.forEach((t:any)=>{ const key = t?.horizon ?? 'today'; (g[key] ||= []).push((t?.text ?? '') + (t?.symbol?` (${t.symbol})`:'')); });
    return g;
  }, [items]);
  return (
    <div className="grid md:grid-cols-3 gap-3">
      <ListBox title="Today" items={groups.today ?? []} />
      <ListBox title="This Week" items={groups.this_week ?? []} />
      <ListBox title="This Month" items={groups.this_month ?? []} />
    </div>
  );
}
