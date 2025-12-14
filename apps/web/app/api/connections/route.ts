import { db as prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireAuthOrgMembership, requireAdmin } from "@/app/api/route-helpers";
import { NextResponse } from "next/server";
import { rateLimit } from "@tiasas/core/src/ratelimit";
import { z } from "zod";
import { cookies } from "next/headers";

const createSchema = z.object({ provider: z.enum(["PAPER", "ETRADE", "ROBINHOOD", "FIDELITY", "SCHWAB"]) });

export async function GET() {
  // All roles can view connections
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId } = auth;
  const rows = await prisma.connection.findMany({ where: { orgId } });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  // Require ADMIN role to create broker connections
  const res = await requireAuthOrgMembership();
  if ("error" in res) return res.error;
  const orgId = res.orgId;
  const session = res.session;
  if (!("user" in res)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = res.user;
  const membership = res.membership;

  // Check ADMIN role
  if (membership.role !== "ADMIN" && membership.role !== "OWNER") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const rl = rateLimit(`connections:${session.user?.email || "unknown"}`);
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const created = await prisma.connection.create({ data: { orgId, provider: parsed.data.provider as any, status: "DISCONNECTED", createdBy: user.id } });
  await prisma.auditLog.create({ data: { orgId, userId: user.id, action: "CREATE", entity: "Connection", entityId: created.id, before: Prisma.DbNull, after: JSON.parse(JSON.stringify(created)) } });
  return NextResponse.json(created);
}
