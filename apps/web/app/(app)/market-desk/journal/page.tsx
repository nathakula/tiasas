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
      <DailyPnlForm />

      {/* Comprehensive P&L data table */}
      <PnlTable initialEntries={pnlEntriesFormatted} />

      {/* Showing only the list for now; creation moved to Daily P&L form */}
      <JournalClient initialEntries={entries} showCreate={false} />
    </div>
  );
}
