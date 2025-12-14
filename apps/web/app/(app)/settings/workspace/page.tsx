import { db as prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MembersTable } from "@/components/workspace/members-table";
import { InvitationsTable } from "@/components/workspace/invitations-table";
import { InviteMemberButton } from "@/components/workspace/invite-member-button";

export default async function WorkspaceSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  // Get active org from cookie
  const cookieStore = await cookies();
  let orgId = cookieStore.get("active_org")?.value;

  if (!orgId) {
    const firstMembership = await prisma.membership.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    orgId = firstMembership?.orgId;
  }

  if (!orgId) {
    redirect("/settings");
  }

  // Get current user's membership to check role
  const currentMembership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: user.id, orgId } },
  });

  if (!currentMembership) {
    redirect("/settings");
  }

  // Get org details
  const org = await prisma.org.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    redirect("/settings");
  }

  // Get all members
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

  // Get pending invitations (only if ADMIN or OWNER)
  const canManageInvitations = currentMembership.role === "ADMIN" || currentMembership.role === "OWNER";

  const invitations = canManageInvitations
    ? await prisma.invitation.findMany({
        where: { orgId, status: "PENDING" },
        include: {
          inviter: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const isOwner = currentMembership.role === "OWNER";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {org.name}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Manage workspace members and permissions
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canManageInvitations && (
              <>
                <Link
                  href="/settings/workspace/audit-logs"
                  className="px-4 py-2 text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                >
                  View Audit Logs
                </Link>
                <InviteMemberButton orgId={orgId} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Members Section */}
      <div className="card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
            Members
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {members.length} {members.length === 1 ? "member" : "members"} in this workspace
          </p>
        </div>
        <MembersTable
          members={members}
          currentUserId={user.id}
          currentUserRole={currentMembership.role}
          isOwner={isOwner}
        />
      </div>

      {/* Pending Invitations Section */}
      {canManageInvitations && invitations.length > 0 && (
        <div className="card p-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
              Pending Invitations
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {invitations.length} invitation{invitations.length === 1 ? "" : "s"} waiting for response
            </p>
          </div>
          <InvitationsTable invitations={invitations} />
        </div>
      )}

      {/* Role Descriptions */}
      <div className="card p-6">
        <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">
          Role Permissions
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex gap-3">
            <div className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded font-medium h-fit">
              OWNER
            </div>
            <div className="flex-1 text-slate-700 dark:text-slate-300">
              Full control: invite/remove members, change roles, manage broker connections, and modify all data
            </div>
          </div>
          <div className="flex gap-3">
            <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-medium h-fit">
              ADMIN
            </div>
            <div className="flex-1 text-slate-700 dark:text-slate-300">
              Invite members, manage broker connections, export data, and modify all data
            </div>
          </div>
          <div className="flex gap-3">
            <div className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded font-medium h-fit">
              MEMBER
            </div>
            <div className="flex-1 text-slate-700 dark:text-slate-300">
              Add and edit journal entries, trades, and notes
            </div>
          </div>
          <div className="flex gap-3">
            <div className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium h-fit">
              VIEWER
            </div>
            <div className="flex-1 text-slate-700 dark:text-slate-300">
              Read-only access to view dashboard, journal, P&L, and positions
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
