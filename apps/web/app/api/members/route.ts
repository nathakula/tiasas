import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAuthOrgMembership } from "../route-helpers";
import { db as prisma } from "@/lib/db";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@tiasas/database";

/**
 * GET /api/members
 * List all members in the current org
 */
export async function GET(req: NextRequest) {
  const res = await requireAuthOrgMembership();
  if ("error" in res) return res.error;
  const { orgId } = res;

  const members = await prisma.membership.findMany({
    where: { orgId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        },
      },
    },
    orderBy: [
      { role: "desc" }, // OWNER first
      { createdAt: "asc" },
    ],
  });

  return NextResponse.json({ members });
}

const updateMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(["VIEWER", "MEMBER", "ADMIN", "OWNER"]),
});

/**
 * PATCH /api/members
 * Update a member's role (OWNER only)
 */
export async function PATCH(req: NextRequest) {
  const res = await requireAuthOrgMembership();
  if ("error" in res) return res.error;
  const orgId = res.orgId;
  if (!("user" in res)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = res.user;
  const membership = res.membership;

  // Only OWNER can change roles
  if (membership.role !== "OWNER") {
    return NextResponse.json(
      { error: "Only workspace owners can change member roles" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = updateMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { userId, role } = parsed.data;

    // Prevent changing your own role
    if (userId === user.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    // Verify the member exists in this org
    const targetMembership = await prisma.membership.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: "Member not found in this workspace" },
        { status: 404 }
      );
    }

    // Update the role and log the change in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      const updatedMembership = await tx.membership.update({
        where: { id: targetMembership.id },
        data: { role },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      // Log role change (audit logging)
      await tx.auditLog.create({
        data: {
          orgId,
          userId: user.id,
          action: "ROLE_CHANGED",
          entity: "Membership",
          entityId: targetMembership.id,
          before: { role: targetMembership.role, userId: userId },
          after: { role, changedBy: user.id, userId: userId }
        }
      });

      return updatedMembership;
    });

    return NextResponse.json({ membership: updated });
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/members?userId=xxx
 * Remove a member from the workspace (ADMIN/OWNER only)
 */
export async function DELETE(req: NextRequest) {
  const res = await requireAuthOrgMembership();
  if ("error" in res) return res.error;
  const orgId = res.orgId;
  if (!("user" in res)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = res.user;
  const membership = res.membership;

  // Check ADMIN role
  if (membership.role !== "ADMIN" && membership.role !== "OWNER") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const userId = req.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Prevent removing yourself
    if (userId === user.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself. Transfer ownership first or leave the workspace." },
        { status: 400 }
      );
    }

    // Verify the member exists in this org
    const targetMembership = await prisma.membership.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: "Member not found in this workspace" },
        { status: 404 }
      );
    }

    // Only OWNER can remove other OWNERs or ADMINs
    if (targetMembership.role === "OWNER" || targetMembership.role === "ADMIN") {
      if (membership.role !== "OWNER") {
        return NextResponse.json(
          { error: "Only workspace owners can remove admins or other owners" },
          { status: 403 }
        );
      }
    }

    // Delete the membership and log the action in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.membership.delete({
        where: { id: targetMembership.id },
      });

      // Log member removal (audit logging)
      await tx.auditLog.create({
        data: {
          orgId,
          userId: user.id,
          action: "MEMBER_REMOVED",
          entity: "Membership",
          entityId: targetMembership.id,
          before: { userId: userId, role: targetMembership.role },
          after: Prisma.DbNull
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
