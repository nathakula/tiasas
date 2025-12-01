import { cache } from "react";
import { prisma } from "@/lib/db";
import { getActiveOrgId } from "@/lib/org";
import ChartsClient from "./charts_client";

type Row = {
  month: string;
  realized: string | number | null;
  nav: string | number | null;
  prev_nav: string | number | null;
  unrealized_snapshot: string | number | null;
};

const getMonthlyPnlData = cache(async (orgId: string, year: number) => {
  const rangeFrom = new Date(year, 0, 1);
  const rangeTo = new Date(year, 11, 31);

  const rows = (await prisma.$queryRaw`
    WITH daily_agg AS (
      SELECT date_trunc('month', date)::date AS month,
             SUM("realizedPnl") AS realized,
             MAX(date) AS last_date
        FROM "DailyPnl"
       WHERE "orgId" = ${orgId} AND date BETWEEN ${rangeFrom} AND ${rangeTo}
       GROUP BY date_trunc('month', date)::date
    ),
    unrealized_last AS (
      SELECT DISTINCT ON (date_trunc('month', date)::date)
             date_trunc('month', date)::date AS month,
             "unrealizedPnl" AS unrealized_snapshot
        FROM "DailyPnl"
       WHERE "orgId" = ${orgId} AND date BETWEEN ${rangeFrom} AND ${rangeTo}
       ORDER BY date_trunc('month', date)::date, date DESC
    ),
    nav_data AS (
      SELECT date_trunc('month', date)::date AS month,
             nav,
             LAG(nav) OVER (ORDER BY date) AS prev_nav
        FROM "MonthlyNav_eom"
       WHERE "orgId" = ${orgId} AND date BETWEEN ${rangeFrom} AND ${rangeTo}
    )
    SELECT COALESCE(d.month, n.month)::text AS month,
           d.realized,
           n.nav,
           n.prev_nav,
           u.unrealized_snapshot
      FROM daily_agg d
      FULL OUTER JOIN nav_data n ON d.month = n.month
      LEFT JOIN unrealized_last u ON COALESCE(d.month, n.month) = u.month
     ORDER BY COALESCE(d.month, n.month)
  `) as unknown as Row[];

  return rows.map((r) => ({
    month: r.month.slice(0, 7), // yyyy-mm
    realized: Number(r.realized ?? 0),
    navEnd: r.nav == null ? null : Number(r.nav),
  }));
});

export default async function ChartsPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) return <div>No active org.</div>;

  const currentYear = new Date().getFullYear();
  const initialData = await getMonthlyPnlData(orgId, currentYear);

  return <ChartsClient initialYear={currentYear} initialData={initialData} />;
}
