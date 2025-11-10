import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import JournalClient from "./journal_client";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const orgId = (await cookies()).get("active_org")?.value ?? null;
  if (!orgId) return <div>No active org.</div>;
  const entries = await prisma.journalEntry.findMany({
    where: { orgId },
    orderBy: { date: "desc" },
    take: 100,
  });
  return <JournalClient initialEntries={entries} />;
}

