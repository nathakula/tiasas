import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import { prisma } from "@/lib/db";
import { parseCsv, toDecimalString } from "@/lib/csv";
import { rateLimit } from "@/lib/ratelimit";

const RowSchema = z.object({
  date: z.string(),
  realized: z.string(),
  unrealized: z.string().optional(),
  nav: z.string().optional(),
  note: z.string().optional(),
});

const PayloadSchema = z.object({
  text: z.string().optional(),
  rows: z.array(RowSchema).optional(),
  strategy: z.enum(["upsert", "skip"]).default("upsert"),
  dryRun: z.boolean().optional(),
});

function normalizeRows(payload: z.infer<typeof PayloadSchema>) {
  const out: z.infer<typeof RowSchema>[] = [];
  if (payload.rows) return payload.rows;
  if (!payload.text) return out;
  const [header, ...lines] = parseCsv(payload.text);
  const h = header.map((s) => s.toLowerCase());
  const idx = {
    date: h.indexOf("date"),
    realized: h.indexOf("realized"),
    unrealized: h.indexOf("unrealized"),
    nav: h.indexOf("nav"),
    note: h.indexOf("note"),
  };
  for (const cols of lines) {
    const date = cols[idx.date];
    const realized = toDecimalString(cols[idx.realized]);
    const unrealized = toDecimalString(cols[idx.unrealized]);
    const nav = toDecimalString(cols[idx.nav]);
    const note = idx.note >= 0 ? cols[idx.note] : undefined;
    if (!date || !realized) continue;
    out.push({ date, realized, unrealized, nav, note });
  }
  return out;
}

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId, session, user } = auth as any;
  const rl = rateLimit(`bulk:pnl:${session.user.email}`, 5);
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const rows = normalizeRows(parsed.data);
  if (!rows.length) return NextResponse.json({ error: "No rows" }, { status: 400 });
  const dryRun = !!parsed.data.dryRun;
  const strategy = parsed.data.strategy;

  const results = { total: rows.length, imported: 0, skipped: 0, errors: [] as { i: number; error: string }[] };
  const before: any[] = [];
  const after: any[] = [];
  const chunkSize = 200;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await prisma.$transaction(async (tx) => {
      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j]!;
        const iGlobal = i + j + 1;
        try {
          const dateIso = `${row.date}T00:00:00.000Z`;
          const existing = await tx.dailyPnl.findUnique({ where: { orgId_date: { orgId, date: new Date(dateIso) } } });
          if (strategy === "skip" && existing) { results.skipped++; continue; }
          if (dryRun) { results.imported++; continue; }
          if (existing) before.push(existing);
          const up = await tx.dailyPnl.upsert({
            where: { orgId_date: { orgId, date: new Date(dateIso) } },
            update: { realizedPnl: row.realized as any, unrealizedPnl: (row.unrealized ?? "0") as any, navEnd: (row.nav ?? "0") as any, note: row.note ?? null },
            create: { orgId, date: new Date(dateIso), realizedPnl: row.realized as any, unrealizedPnl: (row.unrealized ?? "0") as any, navEnd: (row.nav ?? "0") as any, note: row.note ?? null },
          });
          after.push(up);
          results.imported++;
        } catch (e: any) {
          results.errors.push({ i: iGlobal, error: e?.message ?? "Unknown" });
        }
      }
    });
  }

  // Record import for undo
  if (!dryRun) {
    try {
      await prisma.$executeRawUnsafe(
        'CREATE TABLE IF NOT EXISTS "BulkImport" (id TEXT PRIMARY KEY, "orgId" TEXT NOT NULL, "userId" TEXT, type TEXT NOT NULL, summary JSONB NOT NULL, before JSONB, after JSONB, "createdAt" TIMESTAMP DEFAULT now())'
      );
      const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
      await prisma.$executeRaw`INSERT INTO "BulkImport" (id, "orgId", "userId", type, summary, before, after) VALUES (${id}, ${orgId}, ${user?.id ?? null}, 'PNL', ${JSON.stringify(results)}::jsonb, ${JSON.stringify(before)}::jsonb, ${JSON.stringify(after)}::jsonb)`;
    } catch {}
  }

  return NextResponse.json({ ok: true, ...results });
}
