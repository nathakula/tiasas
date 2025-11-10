import { prisma } from "@/lib/db";
import { getActiveOrgId } from "@/lib/org";
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";
import CalendarClient from "./calendar_client";

export default async function CalendarPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) return <div>No active org.</div>;
  const today = new Date();
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  const [entries, trades, pnl] = await Promise.all([
    prisma.journalEntry.findMany({ where: { orgId, date: { gte: start, lte: end } } }),
    prisma.trade.findMany({ where: { orgId, date: { gte: start, lte: end } } }),
    prisma.dailyPnl.findMany({ where: { orgId, date: { gte: start, lte: end } } }),
  ]);
  const days = eachDayOfInterval({ start, end });
  const byDay = new Map<string, { e: number; t: number }>();
  for (const d of days) byDay.set(format(d, "yyyy-MM-dd"), { e: 0, t: 0 });
  for (const e of entries) {
    const k = format(e.date, "yyyy-MM-dd");
    byDay.set(k, { ...(byDay.get(k) ?? { e: 0, t: 0 }), e: (byDay.get(k)?.e ?? 0) + 1 });
  }
  for (const t of trades) {
    const k = format(t.date, "yyyy-MM-dd");
    byDay.set(k, { ...(byDay.get(k) ?? { e: 0, t: 0 }), t: (byDay.get(k)?.t ?? 0) + 1 });
  }

  const pnlByDate = new Map(pnl.map(p => [format(p.date, "yyyy-MM-dd"), { realized: p.realizedPnl.toString(), unrealized: p.unrealizedPnl.toString(), navEnd: p.navEnd.toString(), note: p.note ?? "" }]));
  return <CalendarClient initialMonth={format(today, "yyyy-MM")} days={days.map(d=>d.toISOString())} counts={Object.fromEntries(Array.from(byDay.entries()))} pnl={Object.fromEntries(pnlByDate.entries())} />;
}
