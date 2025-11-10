import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import { prisma } from "@/lib/db";
import { parseCsv, toDecimalString } from "@/lib/csv";
import { endOfMonth, parseISO } from "date-fns";
import { rateLimit } from "@/lib/ratelimit";

const RowSchema = z.object({
  date: z.string(), // yyyy-mm or yyyy-mm-dd
  nav: z.string(),
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
  const idx = { date: h.indexOf("date"), nav: h.indexOf("nav") };
  for (const cols of lines) {
    const date = cols[idx.date];
    const nav = toDecimalString(cols[idx.nav]);
    if (!date || !nav) continue;
    out.push({ date, nav });
  }
  return out;
}

function parseFlexible(dateStr: string): Date | null {
  try {
    // yyyy-mm
    if (/^\d{4}-\d{2}$/.test(dateStr)) {
      const [y, m] = dateStr.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    // yyyy-m or yyyy-m-d
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
      return parseISO(dateStr);
    }
    // mm/dd/yyyy or m/d/yyyy
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [mm, dd, yyyy] = dateStr.split("/").map(Number);
      return new Date(yyyy, mm - 1, dd);
    }
    // yyyy/mm
    if (/^\d{4}\/\d{1,2}$/.test(dateStr)) {
      const [yyyy, mm] = dateStr.split("/").map(Number);
      return new Date(yyyy, mm - 1, 1);
    }
    // yyyy.mm
    if (/^\d{4}\.\d{1,2}$/.test(dateStr)) {
      const [yyyy, mm] = dateStr.split(".").map(Number);
      return new Date(yyyy, mm - 1, 1);
    }
  } catch {}
  return null;
}

function toMonthEnd(dateStr: string): Date {
  const base = parseFlexible(dateStr) ?? parseISO(dateStr);
  if (Number.isNaN(base?.getTime?.() ?? NaN)) throw new Error("Invalid date");
  return endOfMonth(base as Date);
}

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId, session, user } = auth as any;
  const rl = rateLimit(`bulk:nav:${session.user.email}`, 5);
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const rows = normalizeRows(parsed.data);
  if (!rows.length) return NextResponse.json({ error: "No rows" }, { status: 400 });
  const dryRun = !!parsed.data.dryRun;
  const strategy = parsed.data.strategy;

  const results = { total: rows.length, imported: 0, skipped: 0, errors: [] as { i: number; error: string }[], preview: [] as any[] };
  // Build preview for dry-run: normalize dates and detect conflicts
  if (dryRun) {
    const normalized: { i: number; inputDate: string; date: string; nav: string }[] = [];
    rows.forEach((r, idx) => {
      try {
        const d = toMonthEnd(r.date);
        normalized.push({ i: idx + 1, inputDate: r.date, date: d.toISOString().slice(0, 10), nav: r.nav });
      } catch (e: any) {
        results.errors.push({ i: idx + 1, error: e?.message ?? "Invalid date" });
      }
    });
    const uniqueDates = Array.from(new Set(normalized.map((r) => r.date)));
    if (uniqueDates.length) {
      const existing = await prisma.dailyPnl.findMany({ where: { orgId, date: { in: uniqueDates.map((d) => new Date(`${d}T00:00:00.000Z`)) } } });
      const ex = new Map(existing.map((e) => [e.date.toISOString().slice(0, 10), e.navEnd?.toString?.() ?? null]));
      results.preview = normalized.map((r) => ({ ...r, exists: ex.has(r.date), existingNav: ex.get(r.date) }));
    }
    results.imported = normalized.length;
    return NextResponse.json({ ok: true, ...results });
  }
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
          const date = toMonthEnd(row.date);
          const existing = await tx.dailyPnl.findUnique({ where: { orgId_date: { orgId, date } } });
          if (strategy === "skip" && existing) { results.skipped++; continue; }
          if (dryRun) { results.imported++; continue; }
          if (existing) before.push(existing);
          const up = await tx.dailyPnl.upsert({
            where: { orgId_date: { orgId, date } },
            // Only update navEnd for existing rows; do not touch realized/unrealized/note
            update: { navEnd: row.nav as any },
            // Create a minimal row for month-end with navEnd populated
            create: { orgId, date, realizedPnl: "0" as any, unrealizedPnl: "0" as any, navEnd: row.nav as any, note: null },
          });
          after.push(up);
          results.imported++;
        } catch (e: any) {
          results.errors.push({ i: iGlobal, error: e?.message ?? "Unknown" });
        }
      }
    });
  }

  if (!dryRun) {
    try {
      await prisma.$executeRawUnsafe(
        'CREATE TABLE IF NOT EXISTS "BulkImport" (id TEXT PRIMARY KEY, "orgId" TEXT NOT NULL, "userId" TEXT, type TEXT NOT NULL, summary JSONB NOT NULL, before JSONB, after JSONB, "createdAt" TIMESTAMP DEFAULT now())'
      );
      const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
      await prisma.$executeRaw`INSERT INTO "BulkImport" (id, "orgId", "userId", type, summary, before, after) VALUES (${id}, ${orgId}, ${user?.id ?? null}, 'NAV_MONTHLY', ${JSON.stringify(results)}::jsonb, ${JSON.stringify(before)}::jsonb, ${JSON.stringify(after)}::jsonb)`;
    } catch {}
  }

  return NextResponse.json({ ok: true, ...results });
}
