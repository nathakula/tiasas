import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import { prisma } from "@/lib/db";
import { parseCsv } from "@/lib/csv";
import { rateLimit } from "@/lib/ratelimit";

const RowSchema = z.object({ date: z.string(), text: z.string(), tags: z.string().optional() });
const PayloadSchema = z.object({ text: z.string().optional(), rows: z.array(RowSchema).optional(), dryRun: z.boolean().optional() });

function normalizeRows(payload: z.infer<typeof PayloadSchema>) {
  const out: z.infer<typeof RowSchema>[] = [];
  if (payload.rows) return payload.rows;
  if (!payload.text) return out;
  const [header, ...lines] = parseCsv(payload.text);
  const h = header.map((s) => s.toLowerCase());
  const idx = { date: h.indexOf("date"), text: h.indexOf("text"), tags: h.indexOf("tags") };
  for (const cols of lines) {
    const date = cols[idx.date];
    const text = cols[idx.text];
    const tags = idx.tags >= 0 ? cols[idx.tags] : undefined;
    if (!date || !text) continue;
    out.push({ date, text, tags });
  }
  return out;
}

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId, session, user } = auth as any;
  const rl = rateLimit(`bulk:journal:${session.user.email}`, 5);
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const rows = normalizeRows(parsed.data);
  if (!rows.length) return NextResponse.json({ error: "No rows" }, { status: 400 });
  const dryRun = !!parsed.data.dryRun;
  const results = { total: rows.length, created: 0, errors: [] as { i: number; error: string }[] };
  const created: any[] = [];

  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await prisma.$transaction(async (tx) => {
      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j]!;
        const iGlobal = i + j + 1;
        try {
          if (!dryRun) {
            const createdRow = await tx.journalEntry.create({
              data: {
                orgId,
                userId: user.id,
                date: new Date(`${row.date}T00:00:00.000Z`),
                text: row.text,
                tags: row.tags ? row.tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
              },
            });
            created.push(createdRow);
          }
          results.created++;
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
      await prisma.$executeRaw`INSERT INTO "BulkImport" (id, "orgId", "userId", type, summary, before, after) VALUES (${id}, ${orgId}, ${user?.id ?? null}, 'JOURNAL', ${JSON.stringify(results)}::jsonb, '[]'::jsonb, ${JSON.stringify(created)}::jsonb)`;
    } catch {}
  }

  return NextResponse.json({ ok: true, ...results });
}
