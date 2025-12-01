import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId } = auth;
  const { importId } = await req.json().catch(() => ({}));
  if (!importId) return NextResponse.json({ error: "Missing importId" }, { status: 400 });
  const rows = (await prisma.$queryRaw`SELECT * FROM "BulkImport" WHERE id = ${importId} AND "orgId" = ${orgId} LIMIT 1`) as any[];
  const rec = rows[0];
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const type: string = rec.type;
  const before = (rec.before ?? []) as any[];
  const after = (rec.after ?? []) as any[];

  try {
    await prisma.$transaction(async (tx) => {
      if (type === 'PNL') {
        for (const a of after) {
          const date = new Date(a.date);
          const b = before.find((x) => new Date(x.date).toISOString() === date.toISOString());
          if (b) {
            await tx.dailyPnl.update({ where: { orgId_date: { orgId, date } }, data: { realizedPnl: b.realizedPnl, unrealizedPnl: b.unrealizedPnl, note: b.note } });
          } else {
            await tx.dailyPnl.delete({ where: { orgId_date: { orgId, date } } });
          }
        }
      } else if (type === 'NAV_MONTHLY') {
        for (const a of after) {
          const date = new Date(a.date);
          const b = before.find((x) => new Date(x.date).toISOString() === date.toISOString());
          if (b) {
            await tx.monthlyNavEom.update({ where: { orgId_date: { orgId, date } }, data: { nav: b.nav } });
          } else {
            await tx.monthlyNavEom.delete({ where: { orgId_date: { orgId, date } } });
          }
        }
      } else if (type === 'JOURNAL') {
        for (const a of after) {
          await tx.journalEntry.delete({ where: { id: a.id } });
        }
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Undo failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
