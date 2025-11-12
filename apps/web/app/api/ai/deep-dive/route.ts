import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import type { DeepDiveResult } from "@/lib/ai/types";
import { chatJson } from "@/lib/ai/provider";
import { deepDivePrompt, systemGuard } from "@/lib/ai/prompts";
import { getSnapshot } from "@/lib/market/yahoo";
import { rateLimit } from "@/lib/ratelimit";

const Schema = z.object({ ticker: z.string().min(1), focus: z.string().optional() });

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { session } = auth as any;

  // Rate limit AI requests: 10 requests per minute
  const rl = rateLimit(`ai:deep-dive:${session.user.email}`, 10, 60000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limited. Please try again in a minute." }, { status: 429 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { ticker, focus } = parsed.data;
  const snap = await getSnapshot(ticker).catch(() => null);
  const dataJson = { fundamentals: null, earnings: [], tech: {}, multiples: { pe: snap?.quote?.pe ?? null }, quote: snap?.quote ?? null, ranges: snap?.ranges ?? [] };
  try {
    const prompt = deepDivePrompt({ ticker, focus, dataJson });
    const schema = {
      name: "DeepDiveResult",
      schema: {
        type: "object",
        properties: {
          ticker: { type: "string" },
          overview: { type: "string" },
          recentResults: { anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
          technicalZones: {
            type: "object",
            properties: {
              supports: { type: "array", items: { type: "object", properties: { price: { type: "number" }, note: { type: "string" } }, required: ["price"], additionalProperties: true } },
              resistances: { type: "array", items: { type: "object", properties: { price: { type: "number" }, note: { type: "string" } }, required: ["price"], additionalProperties: true } },
              momentumNote: { type: "string" }
            },
            required: ["supports","resistances"],
          },
          valuationContext: { type: "string" },
          comps: { type: "array", items: { type: "string" } },
          risks: { type: "array", items: { type: "string" } },
          alternativeCases: { type: "array", items: { type: "string" } },
          checklist: { type: "array", items: { type: "string" } },
          sources: { type: "array", items: { type: "string" } },
          disclaimer: { type: "string" },
        },
        required: ["ticker","overview","technicalZones","valuationContext","risks","alternativeCases","checklist","disclaimer"],
        additionalProperties: true,
      },
    } as const;
    let out = await chatJson<DeepDiveResult>({ system: systemGuard, user: prompt, schema });
    // Enrich technical zones if empty
    const q: any = (dataJson as any).quote || {};
    const last = Number(q.regularMarketPrice ?? q.last ?? (dataJson as any).lastClose ?? 0) || 0;
    const lo = Number(q.fiftyTwoWeekLow ?? 0) || (last ? last * 0.7 : 0);
    const hi = Number(q.fiftyTwoWeekHigh ?? 0) || (last ? last * 1.3 : 0);
    out.technicalZones ||= { supports: [], resistances: [] } as any;
    if (!Array.isArray(out.technicalZones.supports) || out.technicalZones.supports.length === 0) out.technicalZones.supports = [lo, last && last*0.95].filter(Boolean).map((p)=>({ price: Number(p) }));
    if (!Array.isArray(out.technicalZones.resistances) || out.technicalZones.resistances.length === 0) out.technicalZones.resistances = [last && last*1.05, hi].filter(Boolean).map((p)=>({ price: Number(p) }));
    if (!out.disclaimer) out.disclaimer = 'For research only. Not investment advice.';
    // Ensure valuation is printable
    if (out && typeof (out as any).valuationContext === 'object') (out as any).valuationContext = JSON.stringify((out as any).valuationContext);
    return NextResponse.json(out);
  } catch (e: any) {
    const q: any = (dataJson as any).quote || {};
    const overview = `${ticker} deep dive (fallback). Last ${q.last ?? q.regularMarketPrice ?? '-'} ${q.currency ?? ''}. PE ${q.trailingPE ?? q.pe ?? '-'}.`;
    const supports = [q.fiftyTwoWeekLow, (q.regularMarketPrice ?? 0)*0.95].filter(Boolean).map((p:number)=>({ price: Number(p) }));
    const resistances = [(q.regularMarketPrice ?? 0)*1.05, q.fiftyTwoWeekHigh].filter(Boolean).map((p:number)=>({ price: Number(p) }));
    const out: DeepDiveResult = {
      ticker,
      overview,
      recentResults: `Fallback summary. 52w range ${q.fiftyTwoWeekLow ?? '-'} - ${q.fiftyTwoWeekHigh ?? '-'}.`,
      technicalZones: { supports, resistances, momentumNote: undefined },
      valuationContext: `Trailing PE: ${q.trailingPE ?? q.pe ?? '-'}`,
      comps: [],
      risks: ["Macro sensitivity", "Execution"],
      alternativeCases: ["Upside: demand strength", "Downside: multiple compression"],
      checklist: ["Define risk", "Size appropriately", "Have exit plan"],
      sources: [],
      disclaimer: 'For research only. Not investment advice.',
    };
    return NextResponse.json(out);
  }
}
