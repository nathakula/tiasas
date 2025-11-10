import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { NextResponse } from "next/server";

const schema = z.object({ name: z.string().min(1) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  const org = await prisma.org.create({ data: { name: parsed.data.name } });
  await prisma.membership.create({ data: { orgId: org.id, userId: user!.id, role: "OWNER" } as any });
  await prisma.auditLog.create({ data: { orgId: org.id, userId: user!.id, action: "CREATE", entity: "Org", entityId: org.id, before: null, after: org } });
  return NextResponse.json(org);
}

