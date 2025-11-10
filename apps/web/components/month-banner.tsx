"use client";

function fmtUSD(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function MonthBanner({
  month,
  realized,
  endNav,
  navChange,
  returnPct,
  unrealizedSnapshot,
}: {
  month: string; // yyyy-mm
  realized: number | null;
  endNav: number | null;
  navChange: number | null;
  returnPct: number | null;
  unrealizedSnapshot: number | null;
}) {
  const profit = (realized ?? 0) > 0;
  const loss = (realized ?? 0) < 0;
  return (
    <div className="card p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-slate-600">{month}</div>
      </div>
      <div className="grid md:grid-cols-5 gap-3 items-center">
        <Stat label="Realized (MTD)" value={fmtUSD(realized ?? 0)} tone={profit ? "pos" : loss ? "neg" : undefined} />
        <Stat label="NAV change" value={fmtUSD(navChange ?? 0)} />
        <Stat label="Return %" value={returnPct == null ? "—" : `${(returnPct * 100).toFixed(2)}%`} />
        <Stat label="End NAV" value={fmtUSD(endNav ?? 0)} />
        <Stat label="Unrealized (last)" value={fmtUSD(unrealizedSnapshot ?? 0)} />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-semibold ${tone === "pos" ? "text-emerald-700" : tone === "neg" ? "text-red-700" : ""}`}>{value}</div>
    </div>
  );
}
