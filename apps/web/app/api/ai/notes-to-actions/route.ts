import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import { prisma } from "@/lib/db";

const Schema = z.object({ journalEntryId: z.string().min(1) });

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId } = auth;
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const id = parsed.data.journalEntryId;
  const entry = await prisma.journalEntry.findUnique({ where: { id } });
  if (!entry || entry.orgId !== orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const symbols = Array.from(new Set((entry.text.match(/\b[A-Z]{1,5}\b/g) ?? []).slice(0,5)));
  const lines = entry.text.split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const tasks = lines.slice(0,6).map((l, i) => ({
    horizon: (i%3===0?"today":i%3===1?"this_week":"this_month") as const,
    symbol: symbols[i%symbols.length],
    text: l.replace(/^[-*]\s*/,"")
  }));
  return NextResponse.json(tasks);
}

