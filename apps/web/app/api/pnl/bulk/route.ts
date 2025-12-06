import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import { db as prisma } from "@/lib/db";
import { parseCsv, toDecimalString } from "@/lib/csv";
import { rateLimit } from "@tiasas/core/src/ratelimit";

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
    const trimmed = (dateStr || '').trim();
    if (!trimmed) throw new Error(`Date is empty or missing`);

    // Try ISO format with various separators (YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD)
    const isoFormat = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoFormat) {
      const [, year, month, day] = isoFormat;
      const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`);
      if (!isNaN(d.getTime())) return d;
    }

    // Try MM/DD/YYYY or M/D/YYYY with various separators
    const usFormat = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (usFormat) {
      const [, part1, part2, year] = usFormat;

      // Try as MM/DD/YYYY first
      const d1 = new Date(`${year}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}T00:00:00.000Z`);
      if (!isNaN(d1.getTime()) && Number(part1) <= 12 && Number(part2) <= 31) return d1;

      // If part1 > 12, it must be DD/MM/YYYY
      if (Number(part1) > 12 && Number(part2) <= 12) {
        const d2 = new Date(`${year}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}T00:00:00.000Z`);
        if (!isNaN(d2.getTime())) return d2;
      }
    }

    // Try parsing with native Date parser as fallback (handles many formats)
    const nativeDate = new Date(trimmed);
    if (!isNaN(nativeDate.getTime())) {
      // Convert to UTC midnight
      return new Date(Date.UTC(nativeDate.getFullYear(), nativeDate.getMonth(), nativeDate.getDate()));
    }

    throw new Error(`Invalid date format "${trimmed}". Accepted: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, YYYY/MM/DD (e.g., 2025-01-15, 1/15/2025, 15-01-2025)`);
  }

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await prisma.$transaction(async (tx) => {
      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j]!;
        const iGlobal = i + j + 1;
        try {
          // Log first few rows for debugging
          if (iGlobal <= 3) {
            console.log(`[Bulk Import Debug] Row ${iGlobal}:`, JSON.stringify(row));
          }

          // Parse date with flexible format support
          const dateObj = parseFlexibleDate(row.date);

          // Validate numeric fields
          if (!row.realized || row.realized.trim() === '' || isNaN(Number(row.realized))) {
            throw new Error(`Invalid realized P&L value "${row.realized}" (from date: ${row.date}). Must be a valid number (e.g., 5000 or -1250.50). Check CSV column alignment.`);
          }
          if (row.unrealized && row.unrealized.trim() !== '' && isNaN(Number(row.unrealized))) {
            throw new Error(`Invalid unrealized P&L value "${row.unrealized}" (from date: ${row.date}). Must be a valid number (e.g., 2000 or -500.25). Check CSV column alignment.`);
          }

          if (iGlobal <= 3) {
            console.log(`[Bulk Import Debug] Row ${iGlobal} validated - date: ${dateObj.toISOString()}, realized: ${row.realized}, unrealized: ${row.unrealized}`);
          }

          const existing = await tx.dailyPnl.findUnique({ where: { orgId_date: { orgId, date: dateObj } } });
          if (strategy === "skip" && existing) { results.skipped++; continue; }
          if (dryRun) { results.imported++; continue; }
          if (existing) before.push(existing);

          // DailyPnl only has realizedPnl, unrealizedPnl, and note fields
          // NAV is stored separately in MonthlyNav_eom table
          const updateData: any = {
            realizedPnl: row.realized as any,
            unrealizedPnl: (row.unrealized ?? "0") as any,
            note: row.note ?? null
          };
          const createData: any = {
            orgId,
            date: dateObj,
            realizedPnl: row.realized as any,
            unrealizedPnl: (row.unrealized ?? "0") as any,
            note: row.note ?? null
          };

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

          // Log the full error for debugging
          if (iGlobal <= 200) {
            console.error(`[Bulk Import Error] Row ${iGlobal}:`, e);
          }

          // If it's our custom validation error, extract just our message
          if (errorMsg.includes("Invalid date") || errorMsg.includes("Invalid realized") || errorMsg.includes("Invalid unrealized")) {
            errorMsg = errorMsg.split(/invocation:/i)[0].trim();
          } else if (errorMsg.includes("Unique constraint")) {
            errorMsg = `Duplicate date ${row.date} - entry already exists for this date`;
          } else if (errorMsg.includes("prisma") || errorMsg.includes("invocation")) {
            // Show more of the error message for debugging
            const firstLine = errorMsg.split('\n')[0];
            errorMsg = `Database error: ${firstLine}`;
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
    } catch { }
  }

  return NextResponse.json({ ok: true, ...results });
}
