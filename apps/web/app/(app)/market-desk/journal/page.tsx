import { prisma } from "@/lib/db";
import { getActiveOrgId } from "@/lib/org";
import JournalClient from "./journal_client";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) return <div>No active org.</div>;
  const entries = await prisma.journalEntry.findMany({
    where: { orgId },
    orderBy: { date: "desc" },
    take: 100,
  });
  return <JournalClient initialEntries={entries} />;
}
