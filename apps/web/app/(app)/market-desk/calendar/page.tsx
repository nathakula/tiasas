import { db as prisma } from "@/lib/db";
import { getActiveOrgId } from "@/lib/org";
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";
import { cache } from "react";
import CalendarClient from "./calendar_client";
import { Suspense } from "react";

// Cached data fetchers with React.cache for request deduplication
const getMonthData = cache(async (orgId: string, start: Date, end: Date) => {
  // Create UTC dates to ensure consistent timezone handling
  // Database stores dates as "timestamp without timezone" so we need to match that
  const startUtc = new Date(Date.UTC(start.getFullYear(), start.getMonth(), 1, 0, 0, 0, 0));
  const nextMonthStartUtc = new Date(Date.UTC(start.getFullYear(), start.getMonth() + 1, 1, 0, 0, 0, 0));

  console.log('[getMonthData] Query params:', {
    orgId,
    originalStart: start,
    originalStartIso: start.toISOString(),
    startUtc,
    startUtcIso: startUtc.toISOString(),
    nextMonthStartUtc,
    nextMonthStartUtcIso: nextMonthStartUtc.toISOString()
  });

  const results = await Promise.all([
    prisma.journalEntry.findMany({
      where: { orgId, date: { gte: startUtc, lt: nextMonthStartUtc } },
      select: { date: true } // Only select what we need
    }),
    prisma.dailyPnl.findMany({
      where: { orgId, date: { gte: startUtc, lt: nextMonthStartUtc } },
      select: { date: true, realizedPnl: true, unrealizedPnl: true, note: true }
    }),
  ]);

  console.log('[getMonthData] Results:', {
    entriesCount: results[0].length,
    pnlCount: results[1].length,
    pnlDates: results[1].map(p => ({ raw: p.date, iso: p.date.toISOString() }))
  });

  return results;
});

const getMonthlyPnlSummary = cache(async (orgId: string, start: Date, end: Date) => {
  type Row = {
    month: string;
    realized: string | number | null;
    nav: string | number | null;
    prev_nav: string | number | null;
    unrealized_snapshot: string | number | null;
  };

  // Use UTC dates for consistency
  const prevMonthStart = new Date(Date.UTC(start.getFullYear(), start.getMonth() - 1, 1, 0, 0, 0, 0));
  const nextMonthStart = new Date(Date.UTC(start.getFullYear(), start.getMonth() + 1, 1, 0, 0, 0, 0));
  // For NAV LAG calculation, we need to fetch one extra month before prevMonthStart
  const navFetchStart = new Date(Date.UTC(start.getFullYear(), start.getMonth() - 2, 1, 0, 0, 0, 0));

  const rows = (await prisma.$queryRaw`
    WITH daily_agg AS (
      SELECT date_trunc('month', date)::date AS month,
             SUM("realizedPnl") AS realized,
             MAX(date) AS last_date
        FROM "DailyPnl"
       WHERE "orgId" = ${orgId} AND date >= ${prevMonthStart} AND date < ${nextMonthStart}
       GROUP BY date_trunc('month', date)::date
    ),
    unrealized_last AS (
      SELECT DISTINCT ON (date_trunc('month', date)::date)
             date_trunc('month', date)::date AS month,
             "unrealizedPnl" AS unrealized_snapshot
        FROM "DailyPnl"
       WHERE "orgId" = ${orgId} AND date >= ${prevMonthStart} AND date < ${nextMonthStart}
       ORDER BY date_trunc('month', date)::date, date DESC
    ),
    nav_data AS (
      SELECT date_trunc('month', date)::date AS month,
             nav,
             LAG(nav) OVER (ORDER BY date) AS prev_nav
        FROM "MonthlyNav_eom"
       WHERE "orgId" = ${orgId} AND date >= ${navFetchStart} AND date < ${nextMonthStart}
    ),
    latest_nav_before AS (
      SELECT d.month,
             (SELECT nav FROM "MonthlyNav_eom"
              WHERE "orgId" = ${orgId} AND date < d.month
              ORDER BY date DESC LIMIT 1) AS latest_nav_before_month
        FROM daily_agg d
    )
    SELECT d.month::text,
           d.realized,
           COALESCE(n.nav, NULL) AS nav,
           COALESCE(n.prev_nav, lnb.latest_nav_before_month) AS prev_nav,
           u.unrealized_snapshot
      FROM daily_agg d
      LEFT JOIN nav_data n ON d.month = n.month
      LEFT JOIN unrealized_last u ON d.month = u.month
      LEFT JOIN latest_nav_before lnb ON d.month = lnb.month
     ORDER BY d.month
  `) as unknown as Row[];

  const currentMonth = format(start, "yyyy-MM");
  const currentMonthItem = rows.find((r) => r.month.slice(0, 7) === currentMonth);

  console.log('[Calendar Debug]', { currentMonth, currentMonthItem, allRows: rows });

  if (!currentMonthItem) {
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

  const realized = currentMonthItem.realized == null ? 0 : Number(currentMonthItem.realized);
  const endNav = currentMonthItem.nav == null ? null : Number(currentMonthItem.nav);
  const prevEndNav = currentMonthItem.prev_nav == null ? null : Number(currentMonthItem.prev_nav);
  const navChange = endNav != null && prevEndNav != null ? endNav - prevEndNav : null;
  const returnPct = navChange != null && prevEndNav && prevEndNav !== 0 ? navChange / prevEndNav : null;
  const unrealizedSnapshot = currentMonthItem.unrealized_snapshot == null ? null : Number(currentMonthItem.unrealized_snapshot);

  return { month: currentMonth, realized, endNav, prevEndNav, navChange, returnPct, unrealizedSnapshot };
});

export default async function CalendarPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) return <div>No active org.</div>;

  const today = new Date();
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  const toIso = (d: Date) => d.toISOString().slice(0, 10);

  // Debug: Log the date objects being passed to Prisma
  console.log('[Calendar Debug] Date objects:', {
    today,
    start,
    end,
    todayIso: toIso(today),
    startIso: toIso(start),
    endIso: toIso(end),
    todayTimestamp: today.getTime(),
    startTimestamp: start.getTime()
  });

  // Fetch data in parallel with caching
  const [[entries, pnl], summary] = await Promise.all([
    getMonthData(orgId, start, end),
    getMonthlyPnlSummary(orgId, start, end),
  ]);

  const days = eachDayOfInterval({ start, end });
  const byDay = new Map<string, { e: number; t: number }>();
  for (const d of days) byDay.set(toIso(d), { e: 0, t: 0 });

  for (const e of entries) {
    const k = toIso(e.date);
    const curr = byDay.get(k) ?? { e: 0, t: 0 };
    byDay.set(k, { e: curr.e + 1, t: curr.t });
  }

  const pnlByDate = new Map(pnl.map(p => [toIso(p.date), {
    realized: p.realizedPnl.toString(),
    unrealized: p.unrealizedPnl.toString(),
    note: p.note ?? ""
  }]));

  console.log('[Calendar Page Server] PnL data:', {
    pnlCount: pnl.length,
    pnlDates: pnl.map(p => toIso(p.date)),
    pnlRawDates: pnl.map(p => ({ date: p.date, iso: toIso(p.date) })),
    dec1Data: pnl.find(p => toIso(p.date) === '2025-12-01'),
    today: toIso(today),
    start: toIso(start),
    end: toIso(end)
  });

  return (
    <CalendarClient
      initialMonth={format(today, "yyyy-MM")}
      days={days.map(d => d.toISOString().slice(0, 10))}
      counts={Object.fromEntries(Array.from(byDay.entries()))}
      pnl={Object.fromEntries(pnlByDate.entries())}
      initialSummary={summary}
    />
  );
}
