import { prisma } from "@/lib/db";
import { getActiveOrgId } from "@/lib/org";
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";
import { cache } from "react";
import CalendarClient from "./calendar_client";
import { Suspense } from "react";

// Cached data fetchers with React.cache for request deduplication
const getMonthData = cache(async (orgId: string, start: Date, end: Date) => {
  return await Promise.all([
    prisma.journalEntry.findMany({
      where: { orgId, date: { gte: start, lte: end } },
      select: { date: true } // Only select what we need
    }),
    prisma.trade.findMany({
      where: { orgId, date: { gte: start, lte: end } },
      select: { date: true }
    }),
    prisma.dailyPnl.findMany({
      where: { orgId, date: { gte: start, lte: end } },
      select: { date: true, realizedPnl: true, unrealizedPnl: true, navEnd: true, note: true }
    }),
  ]);
});

const getMonthlyPnlSummary = cache(async (orgId: string, start: Date, end: Date) => {
  type Row = {
    month: string;
    realized: string | number | null;
    end_nav: string | number | null;
    end_date: string | Date | null;
    unrealized_snapshot: string | number | null;
    prev_end_nav: string | number | null;
  };

  const prevMonthStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);

  const rows = (await prisma.$queryRaw`WITH base AS (
      SELECT date_trunc('month', date)::date AS month,
             date, "navEnd", "unrealizedPnl", "realizedPnl"
        FROM "DailyPnl"
       WHERE "orgId" = ${orgId} AND date BETWEEN ${prevMonthStart} AND ${end}
    ), sum_month AS (
      SELECT month, SUM("realizedPnl") AS realized
        FROM base
       GROUP BY month
    ), endrows AS (
      SELECT DISTINCT ON (month) month, date AS end_date, "navEnd", "unrealizedPnl"
        FROM base
       ORDER BY month, date DESC
    ), merged AS (
      SELECT s.month, s.realized, e."navEnd" AS end_nav, e.end_date AS end_date, e."unrealizedPnl" AS unrealized_snapshot
        FROM sum_month s
        LEFT JOIN endrows e USING (month)
    )
    SELECT m.month::text,
           m.realized,
           m.end_nav,
           m.end_date,
           m.unrealized_snapshot,
           LAG(m.end_nav) OVER (ORDER BY m.month) AS prev_end_nav
      FROM merged m
     ORDER BY m.month`) as unknown as Row[];

  const currentMonth = format(start, "yyyy-MM");
  const item = rows.find((r) => r.month.slice(0, 7) === currentMonth);

  if (!item) {
    return {
      month: currentMonth,
      realized: 0,
      endNav: null,
      prevEndNav: null,
      navChange: null,
      returnPct: null,
      unrealizedSnapshot: null,
    };
  }

  const realized = item.realized == null ? null : Number(item.realized);
  const endNav = item.end_nav == null ? null : Number(item.end_nav);
  const prevEndNav = item.prev_end_nav == null ? null : Number(item.prev_end_nav);
  const navChange = endNav != null && prevEndNav != null ? endNav - prevEndNav : null;
  const returnPct = navChange != null && prevEndNav && prevEndNav !== 0 ? navChange / prevEndNav : null;
  const unrealizedSnapshot = item.unrealized_snapshot == null ? null : Number(item.unrealized_snapshot);

  return { month: currentMonth, realized, endNav, prevEndNav, navChange, returnPct, unrealizedSnapshot };
});

export default async function CalendarPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) return <div>No active org.</div>;

  const today = new Date();
  const start = startOfMonth(today);
  const end = endOfMonth(today);

  // Fetch data in parallel with caching
  const [[entries, trades, pnl], summary] = await Promise.all([
    getMonthData(orgId, start, end),
    getMonthlyPnlSummary(orgId, start, end),
  ]);

  const days = eachDayOfInterval({ start, end });
  const byDay = new Map<string, { e: number; t: number }>();
  for (const d of days) byDay.set(format(d, "yyyy-MM-dd"), { e: 0, t: 0 });

  for (const e of entries) {
    const k = format(e.date, "yyyy-MM-dd");
    const curr = byDay.get(k) ?? { e: 0, t: 0 };
    byDay.set(k, { ...curr, e: curr.e + 1 });
  }
  for (const t of trades) {
    const k = format(t.date, "yyyy-MM-dd");
    const curr = byDay.get(k) ?? { e: 0, t: 0 };
    byDay.set(k, { ...curr, t: curr.t + 1 });
  }

  const pnlByDate = new Map(pnl.map(p => [format(p.date, "yyyy-MM-dd"), {
    realized: p.realizedPnl.toString(),
    unrealized: p.unrealizedPnl.toString(),
    navEnd: p.navEnd.toString(),
    note: p.note ?? ""
  }]));

  return (
    <CalendarClient
      initialMonth={format(today, "yyyy-MM")}
      days={days.map(d=>d.toISOString().slice(0,10))}
      counts={Object.fromEntries(Array.from(byDay.entries()))}
      pnl={Object.fromEntries(pnlByDate.entries())}
      initialSummary={summary}
    />
  );
}
