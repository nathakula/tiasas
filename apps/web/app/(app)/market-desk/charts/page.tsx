import { cache } from "react";
import { prisma } from "@/lib/db";
import { getActiveOrgId } from "@/lib/org";
import ChartsClient from "./charts_client";

type Row = {
  month: string;
  realized: string | number | null;
  end_nav: string | number | null;
  end_date: string | Date | null;
  unrealized_snapshot: string | number | null;
  prev_end_nav: string | number | null;
};

const getMonthlyPnlData = cache(async (orgId: string, year: number) => {
  const rangeFrom = new Date(year, 0, 1);
  const rangeTo = new Date(year, 11, 31);

  const rows = (await prisma.$queryRaw`WITH base AS (
      SELECT date_trunc('month', date)::date AS month,
             date, "navEnd", "unrealizedPnl", "realizedPnl"
        FROM "DailyPnl"
       WHERE "orgId" = ${orgId} AND date BETWEEN ${rangeFrom} AND ${rangeTo}
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

  return rows.map((r) => ({
    month: r.month.slice(0, 7), // yyyy-mm
    realized: Number(r.realized ?? 0),
    navEnd: r.end_nav == null ? null : Number(r.end_nav),
  }));
});

export default async function ChartsPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) return <div>No active org.</div>;

  const currentYear = new Date().getFullYear();
  const initialData = await getMonthlyPnlData(orgId, currentYear);

  return <ChartsClient initialYear={currentYear} initialData={initialData} />;
}
