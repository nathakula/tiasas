import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import type { MacroResult } from "@tiasas/core/src/ai/types";
import { chatJson } from "@tiasas/core/src/ai/provider";
import { macroPrompt, systemGuard } from "@tiasas/core/src/ai/prompts";
import { db as prisma } from "@/lib/db";
import { rateLimit } from "@tiasas/core/src/ratelimit";

const Schema = z.object({ journalEntryId: z.string().min(1) });

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId, session } = auth as any;

  // Rate limit AI requests: 20 requests per minute (this is lighter weight)
  const rl = rateLimit(`ai:notes-to-actions:${session.user.email}`, 20, 60000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limited. Please try again in a minute." }, { status: 429 });

  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const id = parsed.data.journalEntryId;
  const entry = await prisma.journalEntry.findUnique({ where: { id } });
  if (!entry || entry.orgId !== orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const symbols = Array.from(new Set((entry.text.match(/\b[A-Z]{1,5}\b/g) ?? []).slice(0, 5)));
    const sys = "Return ONLY JSON array of {horizon:'today'|'this_week'|'this_month', text:string, symbol?:string}";
    const user = `Task: Convert the journal text into action items.\nSymbols: ${symbols.join(', ')}\nText:\n${entry.text}`;
    const tasks = await chatJson<any[]>({ system: sys, user, temperature: 0 });
    return NextResponse.json(tasks);
  } catch (e: any) {
    // Fallback: split lines into tasks
    const lines = entry.text.split(/\n+/).map((s) => s.trim()).filter(Boolean).slice(0, 9);
    const syms = Array.from(new Set((entry.text.match(/\b[A-Z]{1,5}\b/g) ?? []).slice(0, 5)));
    type Horizon = 'today' | 'this_week' | 'this_month';
    const horizons: Horizon[] = ['today', 'this_week', 'this_month'];
    const tasks = lines.map((l, i) => ({
      horizon: horizons[i % horizons.length],
      text: l.replace(/^[-*]\s*/, ''),
      symbol: syms[i % Math.max(1, syms.length)]
    }));
    return NextResponse.json(tasks);
  }
}
