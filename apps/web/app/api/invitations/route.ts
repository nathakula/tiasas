import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAuthOrgMembership } from "../route-helpers";
import { db as prisma } from "@/lib/db";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const createInvitationSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["VIEWER", "MEMBER", "ADMIN"], {
    errorMap: () => ({ message: "Role must be VIEWER, MEMBER, or ADMIN" })
  }),
});

/**
 * GET /api/invitations
 * List all invitations for the current org (ADMIN/OWNER only)
 */
export async function GET(req: NextRequest) {
  const res = await requireAuthOrgMembership();
  if ("error" in res) return res.error;
  const orgId = res.orgId;
  if (!("membership" in res)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = res.membership;

  // Check ADMIN role
  if (membership.role !== "ADMIN" && membership.role !== "OWNER") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const invitations = await prisma.invitation.findMany({
    where: { orgId },
    include: {
      inviter: {
        select: { name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invitations });
}

/**
 * POST /api/invitations
 * Create a new invitation (ADMIN/OWNER only)
 */
export async function POST(req: NextRequest) {
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

  try {
    const body = await req.json();
    const parsed = createInvitationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { email, role } = parsed.data;

    // Check if user is trying to invite themselves
    if (email.toLowerCase() === user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: "You cannot invite yourself" },
        { status: 400 }
      );
    }

    // Check if user already has membership in this org
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMembership = await prisma.membership.findUnique({
        where: { userId_orgId: { userId: existingUser.id, orgId } },
      });
      if (existingMembership) {
        return NextResponse.json(
          { error: "User is already a member of this workspace" },
          { status: 400 }
        );
      }
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.invitation.findUnique({
      where: { email_orgId: { email, orgId } },
    });

    if (existingInvitation && existingInvitation.status === "PENDING") {
      return NextResponse.json(
        { error: "An invitation has already been sent to this email" },
        { status: 400 }
      );
    }

    // If invitation exists but expired/rejected, delete it
    if (existingInvitation) {
      await prisma.invitation.delete({ where: { id: existingInvitation.id } });
    }

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.invitation.create({
      data: {
        email,
        orgId,
        role,
        invitedBy: user.id,
        expiresAt,
        status: "PENDING",
      },
      include: {
        org: { select: { name: true } },
        inviter: { select: { name: true, email: true } },
      },
    });

    // Log invitation sent (audit logging)
    await logAudit({
      orgId,
      userId: user.id,
      action: "INVITE_SENT",
      entity: "Invitation",
      entityId: invitation.id,
      after: {
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt.toISOString(),
        invitedBy: user.id
      }
    });

    // TODO: Send email notification to invited user
    // This would integrate with your email service (SendGrid, Resend, etc.)
    // await sendInvitationEmail({
    //   to: email,
    //   inviterName: user.name,
    //   orgName: invitation.org.name,
    //   role,
    //   token: invitation.token,
    // });

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/invitations?token=xxx
 * Cancel/revoke an invitation (ADMIN/OWNER only)
 */
export async function DELETE(req: NextRequest) {
  const res = await requireAuthOrgMembership();
  if ("error" in res) return res.error;
  const orgId = res.orgId;
  if (!("membership" in res)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = res.membership;

  // Check ADMIN role
  if (membership.role !== "ADMIN" && membership.role !== "OWNER") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json(
      { error: "Token parameter is required" },
      { status: 400 }
    );
  }

  try {
    const invitation = await prisma.invitation.findUnique({ where: { token } });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Verify invitation belongs to current org
    if (invitation.orgId !== orgId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Only allow cancelling pending invitations
    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Can only cancel pending invitations" },
        { status: 400 }
      );
    }

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "CANCELLED" },
    });

    // Log invitation cancelled (audit logging)
    if (!("user" in res)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = res.user;

    await logAudit({
      orgId,
      userId: user.id,
      action: "INVITE_CANCELLED",
      entity: "Invitation",
      entityId: invitation.id,
      before: { status: "PENDING", email: invitation.email, role: invitation.role },
      after: { status: "CANCELLED" }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    return NextResponse.json(
      { error: "Failed to cancel invitation" },
      { status: 500 }
    );
  }
}
