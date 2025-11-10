import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const symbols = searchParams.getAll("symbol");
  const where: any = symbols.length ? { symbol: { in: symbols } } : {};
  const rows = await prisma.benchmarkSnapshot.findMany({ where, orderBy: { date: "desc" }, take: 200 });
  return NextResponse.json(rows);
}
