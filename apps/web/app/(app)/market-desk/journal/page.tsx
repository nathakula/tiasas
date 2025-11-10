import { prisma } from "@/lib/db";
import { getActiveOrgId } from "@/lib/org";
import JournalClient from "./journal_client";
import { DailyPnlForm } from "./daily_pnl_form";
import JournalSummaryClient from "./journal_summary_client";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) return <div>No active org.</div>;
  const entries = await prisma.journalEntry.findMany({
    where: { orgId },
    orderBy: { date: "desc" },
    take: 100,
  });
  return (
    <div className="space-y-6">
      <JournalSummaryClient />
      <DailyPnlForm />
      {/* Showing only the list for now; creation moved to Daily P&L form */}
      <JournalClient initialEntries={entries} showCreate={false} />
    </div>
  );
}
