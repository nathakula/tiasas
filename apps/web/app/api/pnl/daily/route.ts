import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import { z } from "zod";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { cookies } from "next/headers";

const upsertSchema = z.object({
  date: z.string(),
  realizedPnl: z.string(), // required
  unrealizedPnl: z.string().optional(), // optional, default 0
  note: z.string().optional(),
});

export async function GET(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId } = auth;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const where: any = { orgId };
  if (from || to) where.date = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
  const rows = await prisma.dailyPnl.findMany({ where, orderBy: { date: "asc" } });
  const response = NextResponse.json(rows);
  // Cache for 2 minutes since daily P&L data doesn't change frequently
  response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
  return response;
}

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId, session, user } = auth as any;
  const rl = rateLimit(`pnl:${session.user.email}`);
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;
  const dateIso = `${d.date}T00:00:00.000Z`;
  const up = await prisma.dailyPnl.upsert({
    where: { orgId_date: { orgId, date: new Date(dateIso) } },
    update: { realizedPnl: d.realizedPnl as any, unrealizedPnl: (d.unrealizedPnl ?? "0") as any, note: d.note ?? null },
    create: { orgId, date: new Date(dateIso), realizedPnl: d.realizedPnl as any, unrealizedPnl: (d.unrealizedPnl ?? "0") as any, note: d.note ?? null },
  });
  await prisma.auditLog.create({ data: { orgId, userId: user!.id, action: "UPSERT", entity: "DailyPnl", entityId: up.id, before: Prisma.DbNull, after: JSON.parse(JSON.stringify(up)) } });
  return NextResponse.json(up);
}

export async function DELETE(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId, user } = auth as any;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "Missing date parameter" }, { status: 400 });

  const dateIso = `${date}T00:00:00.000Z`;
  const existing = await prisma.dailyPnl.findUnique({ where: { orgId_date: { orgId, date: new Date(dateIso) } } });
  if (!existing) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  await prisma.dailyPnl.delete({ where: { orgId_date: { orgId, date: new Date(dateIso) } } });
  await prisma.auditLog.create({ data: { orgId, userId: user!.id, action: "DELETE", entity: "DailyPnl", entityId: existing.id, before: JSON.parse(JSON.stringify(existing)), after: Prisma.DbNull } });

  return NextResponse.json({ ok: true });
}
