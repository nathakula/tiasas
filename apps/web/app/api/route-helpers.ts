import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { Role } from "@tiasas/database";

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<Role, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

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
  return { session, orgId, user, membership } as const;
}

/**
 * Check if user has at least the specified role level in the org
 * @param minRole Minimum required role (VIEWER, MEMBER, ADMIN, or OWNER)
 */
export async function requireRole(minRole: Role) {
  const res = await requireAuthOrgMembership();
  if ("error" in res) return res;

  // TypeScript type narrowing - check that user and membership exist
  if (!("user" in res) || !("membership" in res)) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  const membership = res.membership;

  if (ROLE_HIERARCHY[membership.role] < ROLE_HIERARCHY[minRole]) {
    return {
      error: NextResponse.json(
        { error: "Insufficient permissions", required: minRole, actual: membership.role },
        { status: 403 }
      )
    } as const;
  }

  return res;
}

/**
 * Check if user is OWNER or ADMIN (can manage workspace members)
 */
export async function requireAdmin() {
  return requireRole("ADMIN");
}

/**
 * Check if user is OWNER (full control)
 */
export async function requireOwner() {
  return requireRole("OWNER");
}

/**
 * Check if user has write access (MEMBER, ADMIN, or OWNER)
 */
export async function requireWriteAccess() {
  return requireRole("MEMBER");
}

/**
 * Utility to check role hierarchy
 */
export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
