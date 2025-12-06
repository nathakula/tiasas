import { db as prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import { z } from "zod";
import { NextResponse } from "next/server";
import { rateLimit } from "@tiasas/core/src/ratelimit";

const upsertSchema = z.object({
  date: z.string(), // End-of-month date (e.g., 2025-05-31)
  nav: z.string(), // NAV value
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
  const rows = await prisma.monthlyNavEom.findMany({ where, orderBy: { date: "asc" } });
  const response = NextResponse.json(rows);
  // Cache for 5 minutes since monthly NAV data doesn't change frequently
  response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return response;
}

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId, session, user } = auth as any;
  const rl = rateLimit(`nav:${session.user.email}`);
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;
  const dateIso = `${d.date}T00:00:00.000Z`;
  const up = await prisma.monthlyNavEom.upsert({
    where: { orgId_date: { orgId, date: new Date(dateIso) } },
    update: { nav: d.nav as any, note: d.note ?? null },
    create: { orgId, date: new Date(dateIso), nav: d.nav as any, note: d.note ?? null },
  });
  await prisma.auditLog.create({
    data: {
      orgId,
      userId: user!.id,
      action: "UPSERT",
      entity: "MonthlyNavEom",
      entityId: up.id,
      before: Prisma.DbNull,
      after: JSON.parse(JSON.stringify(up))
    }
  });
  return NextResponse.json(up);
}
