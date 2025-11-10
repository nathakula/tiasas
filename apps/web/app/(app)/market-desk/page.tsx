import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";

export default async function MarketDeskOverview() {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const orgId = cookieStore.get("active_org")?.value ?? null;
  if (!orgId) return <div className="text-slate-600">No active organization.</div>;

  const [entriesCount, tradesCount, latestNav] = await Promise.all([
    prisma.journalEntry.count({ where: { orgId } }),
    prisma.trade.count({ where: { orgId } }),
    prisma.dailyPnl.findFirst({ where: { orgId }, orderBy: { date: "desc" } }),
  ]);

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card title="Journal entries" value={entriesCount} />
      <Card title="Trades" value={tradesCount} />
      <Card title="Latest NAV" value={latestNav?.navEnd?.toString() ?? "—"} />
    </div>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="card p-6">
      <div className="text-slate-500 text-sm">{title}</div>
      <div className="text-2xl font-semibold mt-2">{value}</div>
    </div>
  );
}

