import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import type { QuickScanResult } from "@/lib/ai/types";

const Schema = z.object({ ticker: z.string().min(1), window: z.enum(["1m","3m","6m","1y"]).default("3m") });

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { ticker, window } = parsed.data;

  const now = new Date();
  const seed = ticker.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 100;
  const base = 100 + seed * 3;
  const supports = [0.92, 0.96].map((m) => ({ price: +(base * m).toFixed(2) }));
  const resistances = [1.04, 1.08].map((m) => ({ price: +(base * m).toFixed(2) }));

  const result: QuickScanResult = {
    ticker,
    window,
    trend: seed % 3 === 0 ? "up" : seed % 3 === 1 ? "down" : "sideways",
    supports,
    resistances,
    entryIdeas: [
      `Buy on reclaim of ${supports[1].price} with tight stop`,
      `Scale near ${supports[0].price} if volume confirms`,
    ],
    exitIdeas: [
      `Trim near ${resistances[0].price}`,
      `Stop if loss through ${supports[0].price}`,
    ],
    ranges: ["1m","3m","6m","1y"].map((p) => ({ period: p, chgPct: +(Math.sin(seed + (p==="1m"?1:p==="3m"?3:p==="6m"?6:12)) * 0.2).toFixed(3), high: +(base*1.15).toFixed(2), low: +(base*0.85).toFixed(2), atr: +(base*0.03).toFixed(2) })),
    catalysts: [ { date: new Date(now.getTime()+7*86400000).toISOString().slice(0,10), label: "Earnings (est.)" } ],
    macroNote: "Risk-on if labor/cpi cool; watch rates.",
    disclaimer: "For research only. Not investment advice.",
  };
  return NextResponse.json(result);
}

