// Note: Authenticated app shell under /app with sidebar
import Link from "next/link";
import { ReactNode } from "react";
import type { Route } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OrgSelector } from "@/components/org-selector";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";

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
      <aside className="bg-white dark:bg-slate-900 border-r dark:border-slate-700">
        <div className="p-4">
          <Logo size="sm" withText href="/market-desk" />
        </div>
        <nav className="px-2 space-y-1">
          <Section label="Home" />
          <NavLink href="/market-desk">Overview</NavLink>
          <Section label="Market Desk" />
          <NavLink href="/market-desk/journal">Journal</NavLink>
          <NavLink href="/market-desk/journal/bulk">Bulk Upload</NavLink>
          <NavLink href="/market-desk/calendar">Calendar</NavLink>
          <NavLink href="/market-desk/charts">Charts</NavLink>
          <NavLink href="/market-desk/ai">Analyst's Bench (AI)</NavLink>
          <Section label="BrokerBridge" />
          <NavLink href="/market-desk/connections">Connections</NavLink>
          <NavLink href="/market-desk/positions">Positions</NavLink>
          <Section label="Settings" />
          <NavLink href="/settings">Profile & Org</NavLink>
          <NavLink href="/market-desk/help">Help Center</NavLink>
        </nav>
      </aside>
      <main>
        <header className="flex items-center justify-between p-4 border-b dark:border-slate-700 bg-white dark:bg-slate-900 gap-3">
          <div className="text-sm text-slate-600 dark:text-slate-400">Active org</div>
          <OrgSelector memberships={memberships} activeOrg={activeOrg} />
          <ThemeToggle />
          <div className="ml-auto">
            <UserMenu name={session.user?.name ?? session.user?.email} />
          </div>
        </header>
        <div className="p-6 bg-slate-50 dark:bg-slate-950">{children}</div>
      </main>
    </div>
  );
}

function Section({ label }: { label: string }) {
  return <div className="mt-4 px-2 text-xs uppercase text-slate-500 dark:text-slate-400">{label}</div>;
}

function NavLink({ href, children }: { href: Route; children: ReactNode }) {
  return (
    <Link
      className="block px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-gold-600 dark:hover:text-gold-400 hover:border-l-2 hover:border-gold-500 transition-all"
      href={href}
    >
      {children}
    </Link>
  );
}
