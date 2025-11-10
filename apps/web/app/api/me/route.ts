import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ user: null });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  const memberships = user
    ? await prisma.membership.findMany({ where: { userId: user.id }, include: { org: true } })
    : [];
  const activeOrg = (await cookies()).get("active_org")?.value ?? null;
  return NextResponse.json({ user, memberships, activeOrg });
}

export async function POST(req: Request) {
  // used to set active org via POST
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { activeOrg } = await req.json().catch(() => ({}));
  if (!activeOrg) return NextResponse.json({ error: "Missing activeOrg" }, { status: 400 });
  // Set cookie on the response so the browser persists it
  const res = NextResponse.json({ ok: true });
  res.cookies.set("active_org", activeOrg, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  // Also mutate the request cookies for this immediate request context
  const cookieStore = await cookies();
  cookieStore.set("active_org", activeOrg);
  return res;
}
