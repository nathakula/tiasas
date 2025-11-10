import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";

type Row = {
  month: string; // yyyy-mm-01
  realized: string | number | null;
  end_nav: string | number | null;
  unrealized_snapshot: string | number | null;
  prev_end_nav: string | number | null;
};

export async function GET(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId } = auth;

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let rangeFrom: Date;
  let rangeTo: Date;
  if (from && to) {
    rangeFrom = new Date(from);
    rangeTo = new Date(to);
  } else if (year) {
    const y = Number(year);
    rangeFrom = new Date(y, 0, 1);
    rangeTo = new Date(y, 11, 31);
  } else {
    const y = new Date().getFullYear();
    rangeFrom = new Date(y, 0, 1);
    rangeTo = new Date(y, 11, 31);
  }

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
      SELECT DISTINCT ON (month) month, "navEnd", "unrealizedPnl"
        FROM base
       ORDER BY month, date DESC
    ), merged AS (
      SELECT s.month, s.realized, e."navEnd" AS end_nav, e."unrealizedPnl" AS unrealized_snapshot
        FROM sum_month s
        LEFT JOIN endrows e USING (month)
    )
    SELECT m.month::text,
           m.realized,
           m.end_nav,
           m.unrealized_snapshot,
           LAG(m.end_nav) OVER (ORDER BY m.month) AS prev_end_nav
      FROM merged m
     ORDER BY m.month`) as unknown as Row[];

  const data = rows.map((r) => {
    const month = r.month.slice(0, 7); // yyyy-mm
    const realized = r.realized == null ? null : Number(r.realized);
    const endNav = r.end_nav == null ? null : Number(r.end_nav);
    const prevEndNav = r.prev_end_nav == null ? null : Number(r.prev_end_nav);
    const navChange = endNav != null && prevEndNav != null ? endNav - prevEndNav : null;
    const returnPct = navChange != null && prevEndNav && prevEndNav !== 0 ? navChange / prevEndNav : null;
    const unrealizedSnapshot = r.unrealized_snapshot == null ? null : Number(r.unrealized_snapshot);
    return { month, realized, endNav, prevEndNav, navChange, returnPct, unrealizedSnapshot };
  });

  return NextResponse.json({ months: data });
}
