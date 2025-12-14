import { db as prisma } from "@/lib/db";
import { getActiveOrgId } from "@/lib/org";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import JournalClient from "./journal_client";
import { DailyPnlForm } from "./daily_pnl_form";
import { PnlTable } from "./pnl_table";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) return <div>No active org.</div>;

  // Get current user's role
  const session = await getServerSession(authOptions);
  const user = session?.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email } })
    : null;
  const membership = user
    ? await prisma.membership.findUnique({
        where: { userId_orgId: { userId: user.id, orgId } },
      })
    : null;
  const userRole = membership?.role || null;

  // Fetch journal entries and daily P&L entries
  const [entries, pnlEntries] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { orgId },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.dailyPnl.findMany({
      where: { orgId },
      orderBy: { date: "desc" },
      take: 200, // Show last 200 P&L entries
    }),
  ]);

  // Convert Decimal to string for PnlTable
  const pnlEntriesFormatted = pnlEntries.map(entry => ({
    ...entry,
    realizedPnl: entry.realizedPnl.toString(),
    unrealizedPnl: entry.unrealizedPnl.toString(),
    totalEquity: entry.totalEquity?.toString() ?? null,
  }));

  // Check if user has write access (MEMBER or higher)
  const canWrite = !!(userRole && ["MEMBER", "ADMIN", "OWNER"].includes(userRole));

  return (
    <div className="space-y-6">
      {!canWrite && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-700 dark:text-blue-300">
          <strong>Read-Only Mode:</strong> You have {userRole || "VIEWER"} access to this workspace.
          Contact the workspace owner to request edit permissions.
        </div>
      )}

      {/* Daily P&L Entry Form - For entering numerical trading data (realized/unrealized P&L, equity) */}
      {canWrite && <DailyPnlForm />}

      {/* Daily P&L History Table - View and edit all daily P&L numerical records */}
      <PnlTable initialEntries={pnlEntriesFormatted} />

      {/* Trading Journal - For writing observations, notes, and thoughts about your trading */}
      <JournalClient initialEntries={entries} showCreate={canWrite} />
    </div>
  );
}
