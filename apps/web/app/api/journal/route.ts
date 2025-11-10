import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import { z } from "zod";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { cookies } from "next/headers";

const createSchema = z.object({
  date: z.string(),
  text: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

export async function GET(req: Request) {
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
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId, session, user } = auth as any;
  const rl = rateLimit(`journal:${session.user.email}`);
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const created = await prisma.journalEntry.create({
    data: { orgId, userId: user!.id, date: new Date(parsed.data.date), text: parsed.data.text, tags: parsed.data.tags },
  });
  await prisma.auditLog.create({ data: { orgId, userId: user!.id, action: "CREATE", entity: "JournalEntry", entityId: created.id, before: Prisma.DbNull, after: JSON.parse(JSON.stringify(created)) } });
  return NextResponse.json(created);
}
