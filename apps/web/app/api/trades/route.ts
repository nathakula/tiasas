import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import { z } from "zod";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { cookies } from "next/headers";

const createSchema = z.object({
  date: z.string(),
  symbol: z.string().min(1),
  side: z.enum(["BUY", "SELL", "SELL_CALL", "SELL_PUT", "ASSIGN", "EXPIRE"]),
  qty: z.string(),
  price: z.string(),
  fees: z.string(),
  strategyTag: z.string().min(1),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId } = auth;
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") ?? undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const strategyTag = searchParams.get("strategyTag") ?? undefined;
  const where: any = { orgId };
  if (symbol) where.symbol = symbol.toUpperCase();
  if (strategyTag) where.strategyTag = strategyTag;
  if (from || to) where.date = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
  const rows = await prisma.trade.findMany({ where, orderBy: { date: "desc" } });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId, session, user } = auth as any;
  const rl = rateLimit(`trades:${session.user.email}`);
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;
  const created = await prisma.trade.create({
    data: {
      orgId,
      userId: user!.id,
      date: new Date(d.date),
      symbol: d.symbol.toUpperCase(),
      side: d.side as any,
      qty: d.qty as any,
      price: d.price as any,
      fees: d.fees as any,
      strategyTag: d.strategyTag,
      notes: d.notes ?? null,
    },
  });
  await prisma.auditLog.create({ data: { orgId, userId: user!.id, action: "CREATE", entity: "Trade", entityId: created.id, before: Prisma.DbNull, after: JSON.parse(JSON.stringify(created)) } });
  return NextResponse.json(created);
}
