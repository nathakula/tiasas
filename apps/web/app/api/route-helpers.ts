import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

export async function requireAuthAndOrg() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  let orgId = (await cookies()).get("active_org")?.value;
  if (!orgId && session.user.email) {
    // Fallback to first org membership if cookie not set
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (user) {
      const member = await prisma.membership.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
      if (member) orgId = member.orgId;
    }
  }
  if (!orgId) return { error: NextResponse.json({ error: "No active org" }, { status: 400 }) } as const;
  return { session, orgId } as const;
}

export async function requireAuthOrgMembership() {
  const res = await requireAuthAndOrg();
  if ("error" in res) return res;
  const { session, orgId } = res;
  const user = await prisma.user.findUnique({ where: { email: session.user!.email! } });
  if (!user) return { error: NextResponse.json({ error: "User not found" }, { status: 401 }) } as const;
  const membership = await prisma.membership.findUnique({ where: { userId_orgId: { userId: user.id, orgId } } });
  if (!membership) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  return { session, orgId, user } as const;
}
