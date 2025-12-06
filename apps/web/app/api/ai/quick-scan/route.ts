import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import type { QuickScanResult } from "@tiasas/core/src/ai/types";
import { chatJson } from "@tiasas/core/src/ai/provider";
import { quickScanPrompt, systemGuard } from "@tiasas/core/src/ai/prompts";
import { getSnapshot } from "@tiasas/core/src/market/yahoo";
import { rateLimit } from "@tiasas/core/src/ratelimit";

const Schema = z.object({ ticker: z.string().min(1), window: z.enum(["1m", "3m", "6m", "1y"]).default("3m") });

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { session } = auth as any;

  // Rate limit AI requests: 10 requests per minute
  const rl = rateLimit(`ai: quick - scan:${session.user.email} `, 10, 60000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limited. Please try again in a minute." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { ticker, window } = parsed.data;

  const snap = await getSnapshot(ticker).catch(() => null);
  const dataJson = {
    quote: snap?.quote ?? null,
    ranges: snap?.ranges ?? [],
    lastClose: snap?.lastClose ?? null,
  };
  try {
    const prompt = quickScanPrompt({ ticker, window, dataJson });
    const schema = {
      name: "QuickScanResult",
      schema: {
        type: "object",
        properties: {
          ticker: { type: "string" },
          window: { type: "string" },
          trend: { enum: ["up", "down", "sideways"] },
          supports: { type: "array", items: { type: "object", properties: { price: { type: "number" }, note: { type: "string" } }, required: ["price"], additionalProperties: true } },
          resistances: { type: "array", items: { type: "object", properties: { price: { type: "number" }, note: { type: "string" } }, required: ["price"], additionalProperties: true } },
          entryIdeas: { type: "array", items: { type: "string" } },
          exitIdeas: { type: "array", items: { type: "string" } },
          ranges: { type: "array", items: { type: "object", properties: { period: { type: "string" }, chgPct: { type: "number" }, high: { type: "number" }, low: { type: "number" }, atr: { type: "number" } }, required: ["period"] } },
          catalysts: { type: "array", items: { type: "object", properties: { date: { type: "string" }, label: { type: "string" } }, required: ["date", "label"] } },
          macroNote: { type: "string" },
          disclaimer: { type: "string" },
        },
        required: ["ticker", "window", "trend", "supports", "resistances", "entryIdeas", "exitIdeas", "ranges", "catalysts", "disclaimer"],
        additionalProperties: true,
      },
    } as const;
    let result = await chatJson<QuickScanResult>({ system: systemGuard, user: prompt, schema });
    // Enrich with Yahoo snapshot if fields are thin
    const q: any = dataJson.quote || {};
    const last = Number(q.regularMarketPrice ?? q.last ?? dataJson.lastClose ?? 0) || 0;
    const lo = Number(q.fiftyTwoWeekLow ?? 0) || (last ? last * 0.7 : 0);
    const hi = Number(q.fiftyTwoWeekHigh ?? 0) || (last ? last * 1.3 : 0);
    if (!Array.isArray(result.supports) || result.supports.length === 0) {
      result.supports = [lo, last && last * 0.95].filter(Boolean).map((p) => ({ price: Number(p) }));
    }
    if (!Array.isArray(result.resistances) || result.resistances.length === 0) {
      result.resistances = [last && last * 1.05, hi].filter(Boolean).map((p) => ({ price: Number(p) }));
    }
    if (!Array.isArray(result.ranges) || result.ranges.length === 0) {
      result.ranges = ((dataJson as any).ranges ?? []).map((r: any) => ({ period: r.period, chgPct: r.chgPct ?? 0, high: hi, low: lo, atr: null }));
    }
    if ((!Array.isArray(result.catalysts) || result.catalysts.length === 0) && q.earningsTimestamp) {
      result.catalysts = [{ date: new Date(q.earningsTimestamp * 1000).toISOString().slice(0, 10), label: 'Earnings' }];
    }
    if (!result.disclaimer) result.disclaimer = 'For research only. Not investment advice.';
    return NextResponse.json(result);
  } catch (e: any) {
    // Fallback: derive simple supports/resistances from Yahoo snapshot when LLM unavailable
    const q = (dataJson as any).quote || {};
    const last = Number(q.regularMarketPrice ?? q.last ?? dataJson.lastClose ?? 0) || 0;
    const lo = Number(q.fiftyTwoWeekLow ?? 0) || (last * 0.7);
    const hi = Number(q.fiftyTwoWeekHigh ?? 0) || (last * 1.3);
    const supports = [lo, last * 0.95].filter(Boolean).map((p) => ({ price: Number(p) }));
    const resistances = [last * 1.05, hi].filter(Boolean).map((p) => ({ price: Number(p) }));
    const result: QuickScanResult = {
      ticker,
      window,
      trend: last > (q.previousClose ?? last) ? 'up' : 'sideways',
      supports,
      resistances,
      entryIdeas: supports.slice(0, 2).map((s) => `Consider buy near ${s.price.toFixed(2)} if volume confirms`),
      exitIdeas: resistances.slice(0, 2).map((r) => `Trim near ${r.price.toFixed(2)} `),
      ranges: (dataJson as any).ranges?.map((r: any) => ({ period: r.period, chgPct: r.chgPct ?? 0, high: hi, low: lo, atr: null })) ?? [],
      catalysts: q.earningsTimestamp ? [{ date: new Date(q.earningsTimestamp * 1000).toISOString().slice(0, 10), label: 'Earnings' }] : [],
      macroNote: undefined,
      disclaimer: 'For research only. Not investment advice.',
    };
    return NextResponse.json(result);
  }
}
