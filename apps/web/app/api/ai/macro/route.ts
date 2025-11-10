import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import type { MacroResult } from "@/lib/ai/types";

const Schema = z.object({ watchlist: z.array(z.string()).optional(), note: z.string().optional() });

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const now = new Date();
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay()+6)%7));
  const days = Array.from({length:5}, (_,i)=>{ const d = new Date(monday); d.setDate(monday.getDate()+i); return d;});

  const weekAhead = days.map((d, i) => ({ date: d.toISOString().slice(0,10), item: ["CPI","FOMC","Jobs","PPI","OPEX"][i%5] }));
  const out: MacroResult = {
    summary: "Risk tone balanced; watch rates, dollar, and liquidity (stub).",
    weekAhead,
    watchouts: ["Event-driven gaps", "Positioning into prints"],
    disclaimer: "For research only. Not investment advice.",
  };
  return NextResponse.json(out);
}

