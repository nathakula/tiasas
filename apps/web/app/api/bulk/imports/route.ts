import { NextResponse } from "next/server";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const { orgId } = auth;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? undefined;
  const limit = Number(searchParams.get("limit") ?? 5);
  let rows: any[] = [];
  if (type) {
    rows = await prisma.$queryRaw`SELECT id, "createdAt", type, summary FROM "BulkImport" WHERE "orgId" = ${orgId} AND type = ${type} ORDER BY "createdAt" DESC LIMIT ${limit}` as any;
  } else {
    rows = await prisma.$queryRaw`SELECT id, "createdAt", type, summary FROM "BulkImport" WHERE "orgId" = ${orgId} ORDER BY "createdAt" DESC LIMIT ${limit}` as any;
  }
  return NextResponse.json({ imports: rows });
}
