import { prisma } from "@/lib/db";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import { z } from "zod";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { cookies } from "next/headers";

const upsertSchema = z.object({
  date: z.string(),
  realizedPnl: z.string(), // required
  unrealizedPnl: z.string().optional(), // optional, default 0
  navEnd: z.string(),
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
  return NextResponse.json(rows);
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
  const up = await prisma.dailyPnl.upsert({
    where: { orgId_date: { orgId, date: new Date(d.date) } },
    update: { realizedPnl: d.realizedPnl as any, unrealizedPnl: (d.unrealizedPnl ?? "0") as any, navEnd: d.navEnd as any, note: d.note ?? null },
    create: { orgId, date: new Date(d.date), realizedPnl: d.realizedPnl as any, unrealizedPnl: (d.unrealizedPnl ?? "0") as any, navEnd: d.navEnd as any, note: d.note ?? null },
  });
  await prisma.auditLog.create({ data: { orgId, userId: user!.id, action: "UPSERT", entity: "DailyPnl", entityId: up.id, before: null, after: up } });
  return NextResponse.json(up);
}
