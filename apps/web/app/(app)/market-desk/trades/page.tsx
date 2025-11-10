import TradesClient from "./trades_client";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const orgId = (await cookies()).get("active_org")?.value ?? null;
  if (!orgId) return <div>No active org.</div>;
  const trades = await prisma.trade.findMany({ where: { orgId }, orderBy: { date: "desc" }, take: 200 });
  return <TradesClient initialTrades={trades} />;
}

