import { db as prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireAuthOrgMembership, requireWriteAccess } from "@/app/api/route-helpers";
import { z } from "zod";
import { NextResponse } from "next/server";
import { rateLimit } from "@tiasas/core/src/ratelimit";
import { cookies } from "next/headers";

const createSchema = z.object({
  date: z.string(),
  text: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

export async function GET(req: Request) {
  // All roles can read journal entries (VIEWER+)
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId } = auth;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const tags = searchParams.getAll("tag");
  const where: any = { orgId };
  if (from || to) where.date = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
  if (tags.length) where.tags = { hasSome: tags };
  const rows = await prisma.journalEntry.findMany({ where, orderBy: { date: "desc" } });
  const response = NextResponse.json(rows);
  // Cache for 2 minutes
  response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
  return response;
}

export async function POST(req: Request) {
  // Require MEMBER role or higher to create journal entries
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const created = await prisma.journalEntry.create({
    data: { orgId, userId: user.id, date: new Date(parsed.data.date), text: parsed.data.text, tags: parsed.data.tags },
  });
  await prisma.auditLog.create({ data: { orgId, userId: user.id, action: "CREATE", entity: "JournalEntry", entityId: created.id, before: Prisma.DbNull, after: JSON.parse(JSON.stringify(created)) } });
  return NextResponse.json(created);
}
