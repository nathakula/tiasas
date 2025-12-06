import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import { db as prisma } from "@/lib/db";
import { parseCsv, toDecimalString } from "@/lib/csv";
import { endOfMonth, parseISO } from "date-fns";
import { rateLimit } from "@tiasas/core/src/ratelimit";

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
  const rows = parseCsv(payload.text);
  if (rows.length === 0) return out;
  let [header, ...lines] = rows;
  let h = header.map((s) => s.toLowerCase());
  let idx = { date: h.indexOf("date"), nav: h.indexOf("nav") };
  // Heuristic: if header does not include expected names, treat header as a data row
  // and assume positional columns (0=date, 1=nav)
  const headerLooksLikeData = () => {
    const d = header?.[0] ?? "";
    return /^\d{4}[-/.]\d{1,2}([-/\\.]\d{1,2})?$/.test(d) || /\d/.test(header?.[1] ?? "");
  };
  if ((idx.date < 0 || idx.nav < 0) && headerLooksLikeData()) {
    lines = [header, ...lines];
    idx = { date: 0 as number, nav: 1 as number } as any;
  }
  for (const cols of lines) {
    const date = cols[idx.date];
    const nav = toDecimalString(cols[idx.nav]);
    if (!date || !nav) continue;
    out.push({ date, nav });
  }
  return out;
}

function parseParts(dateStr: string): { y: number; m: number; d?: number } | null {
  try {
    // Try YYYY-MM format
    if (/^\d{4}-\d{1,2}$/.test(dateStr)) {
      const [y, m] = dateStr.split("-").map(Number);
      return { y, m };
    }

    // Try YYYY-MM-DD format
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
      const d = parseISO(dateStr);
      return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
    }

    // Try MM/YYYY or M/YYYY format
    if (/^\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [mm, yyyy] = dateStr.split("/").map(Number);
      return { y: yyyy, m: mm };
    }

    // Try MM/DD/YYYY or M/D/YYYY format (US format)
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [mm, dd, yyyy] = dateStr.split("/").map(Number);
      return { y: yyyy, m: mm, d: dd };
    }

    // Try YYYY/MM format
    if (/^\d{4}\/\d{1,2}$/.test(dateStr)) {
      const [yyyy, mm] = dateStr.split("/").map(Number);
      return { y: yyyy, m: mm };
    }

    // Try YYYY/MM/DD format
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
      const [yyyy, mm, dd] = dateStr.split("/").map(Number);
      return { y: yyyy, m: mm, d: dd };
    }

    // Try YYYY.MM format
    if (/^\d{4}\.\d{1,2}$/.test(dateStr)) {
      const [yyyy, mm] = dateStr.split(".").map(Number);
      return { y: yyyy, m: mm };
    }
  } catch { }
  return null;
}

function toMonthEnd(dateStr: string): Date {
  const parts = parseParts(dateStr);
  if (!parts) throw new Error("Invalid date");
  const y = parts.y;
  const m = parts.m; // 1-12
  const lastDay = new Date(y, m, 0).getDate();
  // Normalize to UTC midnight to avoid timezone shifts showing next/prev day
  return new Date(Date.UTC(y, m - 1, lastDay, 0, 0, 0));
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
        // Validate NAV is a number
        if (isNaN(Number(r.nav))) {
          throw new Error(`Invalid NAV value "${r.nav}". Must be a number (e.g., 265700 or 280000.50)`);
        }

        const d = toMonthEnd(r.date);
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        normalized.push({ i: idx + 1, inputDate: r.date, date: `${y}-${m}-${dd}`, nav: r.nav });
      } catch (e: any) {
        let errorMsg = e?.message ?? "Invalid date";
        // Provide user-friendly error message
        if (errorMsg === "Invalid date") {
          errorMsg = `Invalid date format "${r.date}". Accepted formats: YYYY-MM, MM/YYYY, YYYY-MM-DD, or MM/DD/YYYY (e.g., 2025-01, 1/2025, or 1/31/2025)`;
        }
        results.errors.push({ i: idx + 1, error: errorMsg });
      }
    });
    const uniqueDates = Array.from(new Set(normalized.map((r) => r.date)));
    if (uniqueDates.length) {
      const existing = await prisma.monthlyNavEom.findMany({ where: { orgId, date: { in: uniqueDates.map((d) => new Date(`${d}T00:00:00.000Z`)) } } });
      const ex = new Map(existing.map((e) => [e.date.toISOString().slice(0, 10), e.nav?.toString?.() ?? null]));
      results.preview = normalized.map((r) => ({ ...r, exists: ex.has(r.date), existingNav: ex.get(r.date) }));
    }
    results.imported = normalized.length;
    return NextResponse.json({ ok: true, ...results });
  }
  const before: any[] = [];
  const after: any[] = [];

  // Helper function to parse flexible date formats for month entries
  function parseFlexibleMonthDate(dateStr: string): string {
    // Try YYYY-MM format
    if (/^\d{4}-\d{1,2}$/.test(dateStr)) {
      return dateStr;
    }

    // Try YYYY-MM-DD format
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
      return dateStr;
    }

    // Try MM/YYYY or M/YYYY
    const usMonthFormat = dateStr.match(/^(\d{1,2})\/(\d{4})$/);
    if (usMonthFormat) {
      const [, month, year] = usMonthFormat;
      return `${year}-${month.padStart(2, '0')}`;
    }

    // Try MM/DD/YYYY or M/D/YYYY
    const usFormat = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usFormat) {
      const [, month, day, year] = usFormat;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try YYYY/MM format
    const isoSlashMonth = dateStr.match(/^(\d{4})\/(\d{1,2})$/);
    if (isoSlashMonth) {
      const [, year, month] = isoSlashMonth;
      return `${year}-${month.padStart(2, '0')}`;
    }

    // Try YYYY/MM/DD
    const isoSlash = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (isoSlash) {
      const [, year, month, day] = isoSlash;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    throw new Error(`Invalid date format. Accepted formats: YYYY-MM, MM/YYYY, YYYY-MM-DD, or MM/DD/YYYY (e.g., 2025-01, 1/2025, or 1/31/2025)`);
  }

  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await prisma.$transaction(async (tx) => {
      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j]!;
        const iGlobal = i + j + 1;
        try {
          // Parse date with flexible format support
          const normalizedDate = parseFlexibleMonthDate(row.date);

          // Validate NAV is a number
          if (isNaN(Number(row.nav))) {
            throw new Error(`Invalid NAV value "${row.nav}". Must be a number (e.g., 265700 or 280000.50)`);
          }

          const date = toMonthEnd(normalizedDate);

          // Check if converted date is valid
          if (isNaN(date.getTime())) {
            throw new Error(`Invalid date "${row.date}". Could not convert to valid end-of-month date.`);
          }

          const existing = await tx.monthlyNavEom.findUnique({ where: { orgId_date: { orgId, date } } });
          if (strategy === "skip" && existing) { results.skipped++; continue; }
          if (dryRun) { results.imported++; continue; }
          if (existing) before.push(existing);
          const up = await tx.monthlyNavEom.upsert({
            where: { orgId_date: { orgId, date } },
            update: { nav: row.nav as any },
            create: { orgId, date, nav: row.nav as any, note: null },
          });
          after.push(up);
          results.imported++;
        } catch (e: any) {
          // Extract user-friendly error message (remove Prisma/stack trace details)
          let errorMsg = e?.message ?? "Unknown error";
          // If it's a Prisma error with our custom message, extract just our message
          if (errorMsg.includes("Invalid date") || errorMsg.includes("Invalid NAV")) {
            errorMsg = errorMsg.split(/invocation:/i)[0].trim();
          } else if (errorMsg.includes("prisma") || errorMsg.includes("invocation")) {
            // Generic Prisma error - provide helpful message
            errorMsg = `Data validation error. Check that date is YYYY-MM format and NAV is a valid number.`;
          }
          results.errors.push({ i: iGlobal, error: errorMsg });
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
    } catch { }
  }

  return NextResponse.json({ ok: true, ...results });
}
