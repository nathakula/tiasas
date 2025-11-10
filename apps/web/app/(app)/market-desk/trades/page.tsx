import TradesClient from "./trades_client";
import { prisma } from "@/lib/db";
import { getActiveOrgId } from "@/lib/org";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) return <div>No active org.</div>;
  const trades = await prisma.trade.findMany({ where: { orgId }, orderBy: { date: "desc" }, take: 200 });
  const formatted = trades.map((t: any) => ({
    id: t.id,
    date: t.date.toISOString(),
    symbol: t.symbol,
    side: String(t.side),
    qty: t.qty?.toString?.() ?? String(t.qty),
    price: t.price?.toString?.() ?? String(t.price),
    fees: t.fees?.toString?.() ?? String(t.fees),
    strategyTag: t.strategyTag,
    notes: t.notes,
  }));
  return <TradesClient initialTrades={formatted} />;
}
