import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import type { DeepDiveResult } from "@/lib/ai/types";

const Schema = z.object({ ticker: z.string().min(1), focus: z.string().optional() });

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { ticker, focus } = parsed.data;
  const seed = ticker.length;
  const supports = [0.9, 0.95].map((m, i) => ({ price: +(100+seed*2)*m, note: i===0?"swing low":"gap fill" }));
  const resistances = [1.05, 1.1].map((m, i) => ({ price: +(100+seed*2)*m, note: i===0?"swing high":"supply" }));
  const out: DeepDiveResult = {
    ticker,
    overview: `${ticker} overview stub.`,
    recentResults: `Revenue +${(seed%5)+3}% y/y; margin ${(seed%10)+20}% (stub).`,
    technicalZones: { supports, resistances, momentumNote: "Momentum improving on weekly (stub)." },
    valuationContext: `Trades at ~${(seed%20)+10}x forward (stub).`,
    comps: ["SPY","QQQ"],
    risks: ["Execution", "Macro sensitivity", "Liquidity"],
    alternativeCases: ["Upside: operating leverage beats", "Downside: multiple compression"],
    checklist: ["Thesis clear", "Levels defined", "Catalyst present", "Sizing planned", "Exit plan set"],
    sources: [],
    disclaimer: "For research only. Not investment advice.",
  };
  return NextResponse.json(out);
}

