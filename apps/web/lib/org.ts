import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getActiveOrgId(): Promise<string | null> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("active_org")?.value ?? null;
  if (fromCookie) return fromCookie;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const memberships = await prisma.membership.findMany({
    where: { user: { email: session.user.email } },
    select: { orgId: true },
    orderBy: { createdAt: "asc" },
  });
  const first = memberships[0]?.orgId ?? null;
  if (first) {
    cookieStore.set("active_org", first);
  }
  return first;
}

export async function requireActiveOrgId(): Promise<string> {
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No active org");
  return orgId;
}
