type Journal = { date: string | Date; text: string; tags: string[] }[];
type Trade = { date: string | Date; symbol: string; side: string; qty: any; price: any }[];
type Pnl = { date: string | Date; realizedPnl: any; unrealizedPnl: any; navEnd: any }[];

export function summarize(journal: Journal, trades: Trade, pnl: Pnl): string {
  const entries = journal.length;
  const symbols = new Set(trades.map((t) => t.symbol));
  const realized = pnl.reduce((acc, d) => acc + Number(d.realizedPnl), 0);
  const nav = pnl.length ? Number(pnl[pnl.length - 1].navEnd) : 0;
  const tags = new Map<string, number>();
  journal.forEach((j) => j.tags.forEach((t) => tags.set(t, (tags.get(t) ?? 0) + 1)));
  const topTags = Array.from(tags.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
  return `You wrote ${entries} journal entries, traded ${symbols.size} symbols, realized ${fmt(realized)}, last NAV ${fmt(nav)}. Common tags: ${topTags.join(", ")}.`;
}

function fmt(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

