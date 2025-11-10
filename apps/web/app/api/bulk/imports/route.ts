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
  const rows = await prisma.$queryRaw`SELECT id, "createdAt", type, summary FROM "BulkImport" WHERE "orgId" = ${orgId} ${type ? prisma.$unsafe(`AND type = '${type}'`) : prisma.$unsafe("")} ORDER BY "createdAt" DESC LIMIT ${limit}` as any;
  return NextResponse.json({ imports: rows });
}

