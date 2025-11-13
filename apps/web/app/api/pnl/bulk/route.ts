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
  const rows = parseCsv(payload.text);
  if (rows.length === 0) return out;
  let [header, ...lines] = rows;
  const toLower = (arr: string[]) => arr.map((s) => s.toLowerCase());
  let h = toLower(header);
  let idx = {
    date: h.indexOf("date"),
    realized: h.indexOf("realized"),
    unrealized: h.indexOf("unrealized"),
    nav: h.indexOf("nav"),
    note: h.indexOf("note"),
  };
  if (idx.note < 0) idx.note = h.indexOf("notes");
  const headerLooksLikeData = () => {
    const d = header?.[0] ?? "";
    return /^\d{4}[-/.]\d{1,2}([-/\\.]\d{1,2})?$/.test(d) || /\d/.test(header?.[1] ?? "");
  };
  if (idx.date < 0 || idx.realized < 0) {
    if (headerLooksLikeData()) {
      // Assume positional columns: date, realized, [unrealized], [nav], [note]
      lines = [header, ...lines];
      const first = lines[0] ?? [];
      idx = { date: 0, realized: 1, unrealized: first.length > 2 ? 2 : -1, nav: first.length > 3 ? 3 : -1, note: first.length > 4 ? 4 : -1 } as any;
    }
  }
  for (const cols of lines) {
    const date = cols[idx.date];
    const realized = toDecimalString(cols[idx.realized]);
    const unrealized = idx.unrealized >= 0 ? toDecimalString(cols[idx.unrealized]) : undefined;
    const nav = idx.nav >= 0 ? toDecimalString(cols[idx.nav]) : undefined;
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

  // Helper function to parse flexible date formats
  function parseFlexibleDate(dateStr: string): Date {
    // Try ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
      const d = new Date(`${dateStr}T00:00:00.000Z`);
      if (!isNaN(d.getTime())) return d;
    }

    // Try MM/DD/YYYY or M/D/YYYY
    const usFormat = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usFormat) {
      const [, month, day, year] = usFormat;
      const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`);
      if (!isNaN(d.getTime())) return d;
    }

    // Try DD/MM/YYYY or D/M/YYYY (assuming day is always larger or context matters)
    const euroFormat = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (euroFormat) {
      const [, part1, part2, year] = euroFormat;
      // If part1 > 12, it must be day, so DD/MM/YYYY
      if (Number(part1) > 12) {
        const d = new Date(`${year}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}T00:00:00.000Z`);
        if (!isNaN(d.getTime())) return d;
      }
    }

    // Try YYYY/MM/DD
    const isoSlash = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (isoSlash) {
      const [, year, month, day] = isoSlash;
      const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`);
      if (!isNaN(d.getTime())) return d;
    }

    throw new Error(`Invalid date format. Accepted formats: YYYY-MM-DD, MM/DD/YYYY, or YYYY/MM/DD (e.g., 2025-01-15 or 1/15/2025)`);
  }

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await prisma.$transaction(async (tx) => {
      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j]!;
        const iGlobal = i + j + 1;
        try {
          // Parse date with flexible format support
          const dateObj = parseFlexibleDate(row.date);

          // Validate numeric fields
          if (isNaN(Number(row.realized))) {
            throw new Error(`Invalid realized P&L "${row.realized}". Must be a number (e.g., 5000 or -1250.50)`);
          }
          if (row.unrealized && isNaN(Number(row.unrealized))) {
            throw new Error(`Invalid unrealized P&L "${row.unrealized}". Must be a number (e.g., 2000 or -500.25)`);
          }

          const existing = await tx.dailyPnl.findUnique({ where: { orgId_date: { orgId, date: dateObj } } });
          if (strategy === "skip" && existing) { results.skipped++; continue; }
          if (dryRun) { results.imported++; continue; }
          if (existing) before.push(existing);
          const updateData: any = { realizedPnl: row.realized as any, unrealizedPnl: (row.unrealized ?? "0") as any, note: row.note ?? null };
          if (typeof row.nav !== 'undefined') updateData.navEnd = row.nav as any; // preserve existing month-end NAV when nav not provided
          const createData: any = { orgId, date: dateObj, realizedPnl: row.realized as any, unrealizedPnl: (row.unrealized ?? "0") as any, navEnd: (row.nav ?? "0") as any, note: row.note ?? null };
          const up = await tx.dailyPnl.upsert({
            where: { orgId_date: { orgId, date: dateObj } },
            update: updateData,
            create: createData,
          });
          after.push(up);
          results.imported++;
        } catch (e: any) {
          // Extract user-friendly error message (remove Prisma/stack trace details)
          let errorMsg = e?.message ?? "Unknown error";
          // If it's a Prisma error with our custom message, extract just our message
          if (errorMsg.includes("Invalid date") || errorMsg.includes("Invalid realized") || errorMsg.includes("Invalid unrealized")) {
            errorMsg = errorMsg.split(/invocation:/i)[0].trim();
          } else if (errorMsg.includes("prisma") || errorMsg.includes("invocation")) {
            // Generic Prisma error - provide helpful message
            errorMsg = `Data validation error. Check that date is YYYY-MM-DD format and numeric fields contain valid numbers.`;
          }
          results.errors.push({ i: iGlobal, error: errorMsg });
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
