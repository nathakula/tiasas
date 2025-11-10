import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import type { MacroResult } from "@/lib/ai/types";
import { chatJson } from "@/lib/ai/provider";
import { macroPrompt, systemGuard } from "@/lib/ai/prompts";

const Schema = z.object({ watchlist: z.array(z.string()).optional(), note: z.string().optional() });

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const now = new Date();
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay()+6)%7));
  const days = Array.from({length:5}, (_,i)=>{ const d = new Date(monday); d.setDate(monday.getDate()+i); return { date: d.toISOString().slice(0,10) };});
  const calendarJson = { days, known: ["CPI","FOMC","Jobs","PPI","OPEX"] };
  try {
    const prompt = macroPrompt({ watchlist: parsed.data.watchlist ?? [], calendarJson });
    const out = await chatJson<MacroResult>({ system: systemGuard, user: prompt });
    return NextResponse.json(out);
  } catch (e: any) {
    // Fallback summary
    const wk = days.map((d, i) => ({ date: d.date, item: calendarJson.known[i%calendarJson.known.length] }));
    return NextResponse.json({
      summary: "This is a fallback macro summary. Watch rates and liquidity; review event calendar.",
      weekAhead: wk,
      watchouts: ["Event-driven gaps", "Overnight headlines"],
      disclaimer: "For research only. Not investment advice.",
    } satisfies MacroResult);
  }
}
