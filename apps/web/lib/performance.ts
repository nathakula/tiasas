import { db as prisma } from "@/lib/db";

export type MonthlyPnlRow = {
    month: string; // yyyy-mm
    realized: number | null;
    endNav: number | null;
    prevEndNav: number | null;
    navChange: number | null;
    returnPct: number | null;
    unrealizedSnapshot: number | null;
};

export async function getMonthlyPnl(orgId: string, year?: number, from?: string, to?: string) {
    // Use half-open [from, toExclusive) range with UTC-normalized dates
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
    const navFetchFrom = new Date(rangeFrom.getTime());
    navFetchFrom.setUTCMonth(navFetchFrom.getUTCMonth() - 1);

    type DbRow = {
        month: string;
        realized: string | number | null;
        nav: string | number | null;
        unrealized_snapshot: string | number | null;
        prev_nav: string | number | null;
    };

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
      SELECT month,
             MAX(nav) as nav,
             MAX(prev_nav) as prev_nav
      FROM (
        SELECT date_trunc('month', date)::date AS month,
               nav,
               LAG(nav) OVER (ORDER BY date) AS prev_nav
          FROM "MonthlyNav_eom"
         WHERE "orgId" = ${orgId} AND date >= ${navFetchFrom} AND date < ${rangeToExclusive}
      ) sub
      GROUP BY month
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
  `) as DbRow[];

    return rows.map((r) => {
        const month = r.month.slice(0, 7); // yyyy-mm
        const realized = r.realized == null ? null : Number(r.realized);
        const endNav = r.nav == null ? null : Number(r.nav);
        const prevEndNav = r.prev_nav == null ? null : Number(r.prev_nav);
        const navChange = endNav != null && prevEndNav != null ? endNav - prevEndNav : null;
        const returnPct = navChange != null && prevEndNav && prevEndNav !== 0 ? navChange / prevEndNav : null;
        const unrealizedSnapshot = r.unrealized_snapshot == null ? null : Number(r.unrealized_snapshot);

        return { month, realized, endNav, prevEndNav, navChange, returnPct, unrealizedSnapshot };
    });
}
