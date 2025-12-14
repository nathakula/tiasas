import { db as prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireAuthOrgMembership, requireWriteAccess } from "@/app/api/route-helpers";
import { z } from "zod";
import { NextResponse } from "next/server";
import { rateLimit } from "@tiasas/core/src/ratelimit";
import { cookies } from "next/headers";

const updateSchema = z.object({ text: z.string().min(1).optional(), tags: z.array(z.string()).optional() });

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  // Require MEMBER role or higher to update journal entries
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const orgId = auth.orgId;
  const session = auth.session;
  if (!("user" in auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;
  const membership = auth.membership;

  // Check MEMBER role
  if (membership.role !== "MEMBER" && membership.role !== "ADMIN" && membership.role !== "OWNER") {
    return NextResponse.json({ error: "Write access required" }, { status: 403 });
  }

  const rl = rateLimit(`journal:${session.user?.email || "unknown"}`);
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const existing = await prisma.journalEntry.findFirst({ where: { id: params.id, orgId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await prisma.journalEntry.update({ where: { id: params.id }, data: parsed.data });
  await prisma.auditLog.create({ data: { orgId, userId: user.id, action: "UPDATE", entity: "JournalEntry", entityId: updated.id, before: JSON.parse(JSON.stringify(existing)), after: JSON.parse(JSON.stringify(updated)) } });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  // Require MEMBER role or higher to delete journal entries
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const orgId = auth.orgId;
  const session = auth.session;
  if (!("user" in auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;
  const membership = auth.membership;

  // Check MEMBER role
  if (membership.role !== "MEMBER" && membership.role !== "ADMIN" && membership.role !== "OWNER") {
    return NextResponse.json({ error: "Write access required" }, { status: 403 });
  }

  const rl = rateLimit(`journal:${session.user?.email || "unknown"}`);
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const existing = await prisma.journalEntry.findFirst({ where: { id: params.id, orgId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.journalEntry.delete({ where: { id: params.id } });
  await prisma.auditLog.create({ data: { orgId, userId: user.id, action: "DELETE", entity: "JournalEntry", entityId: params.id, before: JSON.parse(JSON.stringify(existing)), after: Prisma.DbNull } });
  return NextResponse.json({ ok: true });
}
