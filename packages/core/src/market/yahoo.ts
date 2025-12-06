// Lightweight Yahoo Finance fetcher (unofficial). Use responsibly.
// No API key required; subject to Yahoo changes and rate limits.

type ChartRange = "1mo" | "3mo" | "6mo" | "1y";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36";

async function getJson(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`Yahoo request failed ${res.status}`);
  return res.json();
}

export async function getQuote(ticker: string) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}`;
  const json = await getJson(url);
  const q = json?.quoteResponse?.result?.[0] ?? null;
  if (!q) return null;
  return {
    symbol: q.symbol,
    longName: q.longName ?? q.shortName ?? q.symbol,
    currency: q.currency ?? "USD",
    last: q.regularMarketPrice ?? null,
    changePct: q.regularMarketChangePercent ?? null,
    previousClose: q.regularMarketPreviousClose ?? null,
    dayHigh: q.regularMarketDayHigh ?? null,
    dayLow: q.regularMarketDayLow ?? null,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? null,
    marketCap: q.marketCap ?? null,
    eps: q.epsTrailingTwelveMonths ?? null,
    pe: q.trailingPE ?? null,
    earningsTimestamp: q.earningsTimestamp ?? q.earningsTimestampStart ?? null,
  };
}

export async function getChart(ticker: string, range: ChartRange = "6mo", interval: string = "1d") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`;
  const json = await getJson(url);
  const res = json?.chart?.result?.[0];
  if (!res) return null;
  const ts: number[] = res.timestamp ?? [];
  const closes: number[] = res.indicators?.quote?.[0]?.close ?? [];
  return ts.map((t, i) => ({ t: new Date(t * 1000), close: closes[i] ?? null })).filter((r) => r.close != null);
}

// Simple in-memory cache to soften rate limits during dev
const cache = new Map<string, { at: number; ttl: number; value: any }>();
function memo<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < hit.ttl) return Promise.resolve(hit.value as T);
  return fn().then((v) => { cache.set(key, { at: now, ttl: ttlMs, value: v }); return v; });
}

export async function getSnapshot(ticker: string) {
  return memo(`snap:${ticker}`, 60_000, async () => {
    const [q, y1] = await Promise.all([getQuote(ticker), getChart(ticker, "1y", "1d")]);
    const closes = (y1 ?? []).map((r) => r.close);
    function pctFrom(periodDays: number): number | null {
      if (closes.length < periodDays + 1) return null;
      const last = closes[closes.length - 1];
      const prev = closes[closes.length - 1 - periodDays];
      if (last == null || prev == null || prev === 0) return null;
      return (last - prev) / prev;
    }
    const rangeStats = [
      { period: "1m", chgPct: pctFrom(21) },
      { period: "3m", chgPct: pctFrom(63) },
      { period: "6m", chgPct: pctFrom(126) },
      { period: "1y", chgPct: pctFrom(252) },
    ].filter((r) => r.chgPct != null) as { period: string; chgPct: number }[];

    return {
      quote: q,
      ranges: rangeStats,
      lastClose: closes.at(-1) ?? null,
    };
  });
}

