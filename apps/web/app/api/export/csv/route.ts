import { prisma } from "@/lib/db";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId } = auth;

  const { type, from, to } = await req.json();
  const range = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
  let rows: any[] = [];
  if (type === "journal") rows = await prisma.journalEntry.findMany({ where: { orgId, date: range } });
  else if (type === "trades") rows = await prisma.trade.findMany({ where: { orgId, date: range } });
  else if (type === "pnl") rows = await prisma.dailyPnl.findMany({ where: { orgId, date: range } });
  else return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const csv = toCSV(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=${type}.csv`,
    },
  });
}

function toCSV(rows: any[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const header = cols.join(",");
  const lines = rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? "")).join(","));
  return [header, ...lines].join("\n");
}
