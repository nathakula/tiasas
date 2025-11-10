// Note: Authenticated app shell under /app with sidebar
import Link from "next/link";
import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OrgSelector } from "@/components/org-selector";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/signin");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  const memberships = await prisma.membership.findMany({
    where: { userId: user!.id },
    include: { org: true },
    orderBy: { createdAt: "asc" },
  });
  const cookieStore = await cookies();
  const activeOrg = cookieStore.get("active_org")?.value ?? memberships[0]?.orgId ?? null;

  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <aside className="bg-white border-r">
        <div className="p-4">
          <Logo size="sm" withText href="/app/market-desk" />
        </div>
        <nav className="px-2 space-y-1">
          <Section label="Home" />
          <NavLink href="/app/market-desk">Overview</NavLink>
          <Section label="Market Desk" />
          <NavLink href="/app/market-desk/journal">Journal</NavLink>
          <NavLink href="/app/market-desk/trades">Trades</NavLink>
          <NavLink href="/app/market-desk/calendar">Calendar</NavLink>
          <NavLink href="/app/market-desk/charts">Charts</NavLink>
          <Section label="Settings" />
          <NavLink href="/app/settings">Profile & Org</NavLink>
        </nav>
      </aside>
      <main>
        <header className="flex items-center justify-between p-4 border-b bg-white gap-3">
          <div className="text-sm text-slate-600">Active org</div>
          <OrgSelector memberships={memberships} activeOrg={activeOrg} />
          <div className="ml-auto">
            <UserMenu name={session.user?.name ?? session.user?.email} />
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

function Section({ label }: { label: string }) {
  return <div className="mt-4 px-2 text-xs uppercase text-slate-500">{label}</div>;
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="block px-3 py-2 rounded-md hover:bg-slate-100" href={href}>
      {children}
    </Link>
  );
}
