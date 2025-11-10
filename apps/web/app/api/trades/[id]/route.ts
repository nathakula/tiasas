import { prisma } from "@/lib/db";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import { z } from "zod";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { cookies } from "next/headers";

const updateSchema = z.object({
  symbol: z.string().min(1).optional(),
  side: z.enum(["BUY", "SELL", "SELL_CALL", "SELL_PUT", "ASSIGN", "EXPIRE"]).optional(),
  qty: z.string().optional(),
  price: z.string().optional(),
  fees: z.string().optional(),
  strategyTag: z.string().optional(),
  notes: z.string().nullable().optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId, session, user } = auth as any;
  const rl = rateLimit(`trades:${session.user.email}`);
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const existing = await prisma.trade.findFirst({ where: { id: params.id, orgId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await prisma.trade.update({ where: { id: params.id }, data: parsed.data as any });
  await prisma.auditLog.create({ data: { orgId, userId: user!.id, action: "UPDATE", entity: "Trade", entityId: updated.id, before: existing, after: updated } });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId, session, user } = auth as any;
  const rl = rateLimit(`trades:${session.user.email}`);
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const existing = await prisma.trade.findFirst({ where: { id: params.id, orgId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.trade.delete({ where: { id: params.id } });
  await prisma.auditLog.create({ data: { orgId, userId: user!.id, action: "DELETE", entity: "Trade", entityId: params.id, before: existing, after: null } });
  return NextResponse.json({ ok: true });
}
