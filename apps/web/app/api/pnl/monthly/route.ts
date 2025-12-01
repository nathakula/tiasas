import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";

type Row = {
  month: string; // yyyy-mm-01
  realized: string | number | null;
  nav: string | number | null;
  unrealized_snapshot: string | number | null;
};

export async function GET(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId } = auth;

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Use half-open [from, toExclusive) range with UTC-normalized dates
  // to ensure the last calendar day is always included.
  let rangeFrom: Date;
  let rangeToExclusive: Date;
  if (from && to) {
    const f = new Date(from);
    const t = new Date(to);
    // Normalize to UTC midnight boundaries
    rangeFrom = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate()));
    const tUtc = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
    rangeToExclusive = new Date(tUtc.getTime() + 24 * 60 * 60 * 1000); // next day UTC
  } else if (year) {
    const y = Number(year);
    rangeFrom = new Date(Date.UTC(y, 0, 1));
    rangeToExclusive = new Date(Date.UTC(y + 1, 0, 1));
  } else {
    const y = new Date().getUTCFullYear();
    rangeFrom = new Date(Date.UTC(y, 0, 1));
    rangeToExclusive = new Date(Date.UTC(y + 1, 0, 1));
  }

  // For NAV LAG calculation, we need to fetch one extra month before rangeFrom
  // to properly calculate prev_nav for the first month in the range
  const navFetchFrom = new Date(rangeFrom.getTime());
  navFetchFrom.setUTCMonth(navFetchFrom.getUTCMonth() - 1);

  // Query monthly P&L and NAV separately
  const rows = (await prisma.$queryRaw`
    WITH daily_agg AS (
      SELECT date_trunc('month', date)::date AS month,
             SUM("realizedPnl") AS realized,
             MAX(date) AS last_date
        FROM "DailyPnl"
       WHERE "orgId" = ${orgId} AND date >= ${rangeFrom} AND date < ${rangeToExclusive}
       GROUP BY date_trunc('month', date)::date
    ),
    unrealized_last AS (
      SELECT DISTINCT ON (date_trunc('month', date)::date)
             date_trunc('month', date)::date AS month,
             "unrealizedPnl" AS unrealized_snapshot
        FROM "DailyPnl"
       WHERE "orgId" = ${orgId} AND date >= ${rangeFrom} AND date < ${rangeToExclusive}
       ORDER BY date_trunc('month', date)::date, date DESC
    ),
    nav_data AS (
      SELECT date_trunc('month', date)::date AS month,
             nav,
             LAG(nav) OVER (ORDER BY date) AS prev_nav
        FROM "MonthlyNav_eom"
       WHERE "orgId" = ${orgId} AND date >= ${navFetchFrom} AND date < ${rangeToExclusive}
    ),
    latest_nav_before AS (
      SELECT COALESCE(d.month, n.month) AS month,
             (SELECT nav FROM "MonthlyNav_eom"
              WHERE "orgId" = ${orgId} AND date < COALESCE(d.month, n.month)
              ORDER BY date DESC LIMIT 1) AS latest_nav_before_month
        FROM daily_agg d
        FULL OUTER JOIN nav_data n ON d.month = n.month
    )
    SELECT COALESCE(d.month, n.month)::text AS month,
           d.realized,
           COALESCE(n.nav, NULL) AS nav,
           COALESCE(n.prev_nav, lnb.latest_nav_before_month) AS prev_nav,
           u.unrealized_snapshot
      FROM daily_agg d
      FULL OUTER JOIN nav_data n ON d.month = n.month
      LEFT JOIN unrealized_last u ON COALESCE(d.month, n.month) = u.month
      LEFT JOIN latest_nav_before lnb ON COALESCE(d.month, n.month) = lnb.month
     ORDER BY COALESCE(d.month, n.month)
  `) as unknown as (Row & { prev_nav: string | number | null })[];

  const data = rows.map((r) => {
    const month = r.month.slice(0, 7); // yyyy-mm
    const realized = r.realized == null ? null : Number(r.realized);
    const endNav = r.nav == null ? null : Number(r.nav);
    const prevEndNav = r.prev_nav == null ? null : Number(r.prev_nav);
    const navChange = endNav != null && prevEndNav != null ? endNav - prevEndNav : null;
    const returnPct = navChange != null && prevEndNav && prevEndNav !== 0 ? navChange / prevEndNav : null;
    const unrealizedSnapshot = r.unrealized_snapshot == null ? null : Number(r.unrealized_snapshot);

    return { month, realized, endNav, prevEndNav, navChange, returnPct, unrealizedSnapshot };
  });

  const response = NextResponse.json({ months: data });
  // Cache for 5 minutes since P&L data doesn't change frequently
  response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return response;
}
