import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";
import { z } from "zod";

const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

/**
 * POST /api/invitations/accept
 * Accept an invitation and create membership
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "You must be logged in to accept invitations" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const parsed = acceptInvitationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { token } = parsed.data;

    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        org: { select: { name: true } },
        inviter: { select: { name: true, email: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Verify invitation is for the logged-in user's email
    if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation is not for your email address" },
        { status: 403 }
      );
    }

    // Check if invitation is still pending
    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: `Invitation has already been ${invitation.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      // This shouldn't happen if they're logged in, but handle it gracefully
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
        },
      });
    }

    // Check if membership already exists
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_orgId: { userId: user.id, orgId: invitation.orgId },
      },
    });

    if (existingMembership) {
      // Update invitation status but don't fail
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      });

      return NextResponse.json(
        { error: "You are already a member of this workspace" },
        { status: 400 }
      );
    }

    // Create the membership and update invitation in a transaction
    const [membership] = await prisma.$transaction([
      prisma.membership.create({
        data: {
          userId: user.id,
          orgId: invitation.orgId,
          role: invitation.role,
        },
        include: {
          org: { select: { id: true, name: true } },
        },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      membership,
      message: `You've been added to ${invitation.org.name} as ${invitation.role}`,
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/invitations/accept?token=xxx
 * Get invitation details (for preview before accepting)
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Token parameter is required" },
      { status: 400 }
    );
  }

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        org: { select: { name: true, createdAt: true } },
        inviter: { select: { name: true, email: true, image: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if expired
    const isExpired = new Date() > invitation.expiresAt;
    if (isExpired && invitation.status === "PENDING") {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
    }

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        status: isExpired ? "EXPIRED" : invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        org: invitation.org,
        inviter: invitation.inviter,
      },
    });
  } catch (error) {
    console.error("Error fetching invitation:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitation" },
      { status: 500 }
    );
  }
}
