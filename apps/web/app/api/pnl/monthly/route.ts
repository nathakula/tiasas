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

  const rows = (await prisma.$queryRaw`WITH m AS (
      SELECT date_trunc('month', date)::date AS month,
             SUM("realizedPnl") AS realized,
             max(date) AS last_day
        FROM "DailyPnl"
       WHERE "orgId" = ${orgId} AND date BETWEEN ${rangeFrom} AND ${rangeTo}
       GROUP BY 1
    ), e AS (
      SELECT date_trunc('month', d.date)::date AS month,
             (SELECT d2."navEnd" FROM "DailyPnl" d2 
               WHERE d2."orgId" = d."orgId" AND date_trunc('month', d2.date) = date_trunc('month', d.date)
               ORDER BY d2.date DESC LIMIT 1) AS end_nav,
             (SELECT d3."unrealizedPnl" FROM "DailyPnl" d3 
               WHERE d3."orgId" = d."orgId" AND date_trunc('month', d3.date) = date_trunc('month', d.date)
               ORDER BY d3.date DESC LIMIT 1) AS unrealized_snapshot
        FROM "DailyPnl" d
       WHERE d."orgId" = ${orgId} AND d.date BETWEEN ${rangeFrom} AND ${rangeTo}
       GROUP BY 1
    ), a AS (
      SELECT m.month,
             m.realized,
             e.end_nav,
             e.unrealized_snapshot
        FROM m LEFT JOIN e ON e.month = m.month
    )
    SELECT a.month::text,
           a.realized,
           a.end_nav,
           a.unrealized_snapshot,
           LAG(a.end_nav) OVER (ORDER BY a.month) AS prev_end_nav
      FROM a
     ORDER BY a.month`) as unknown as Row[];

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

