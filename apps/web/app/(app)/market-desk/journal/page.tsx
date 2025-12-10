import { db as prisma } from "@/lib/db";
import { getActiveOrgId } from "@/lib/org";
import JournalClient from "./journal_client";
import { DailyPnlForm } from "./daily_pnl_form";
import { PnlTable } from "./pnl_table";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) return <div>No active org.</div>;

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

  return (
    <div className="space-y-6">
      {/* Daily P&L Entry Form - For entering numerical trading data (realized/unrealized P&L, equity) */}
      <DailyPnlForm />

      {/* Daily P&L History Table - View and edit all daily P&L numerical records */}
      <PnlTable initialEntries={pnlEntriesFormatted} />

      {/* Trading Journal - For writing observations, notes, and thoughts about your trading */}
      <JournalClient initialEntries={entries} showCreate={true} />
    </div>
  );
}
