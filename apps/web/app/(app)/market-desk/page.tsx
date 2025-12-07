
import { db as prisma } from "@/lib/db";
import { getActiveOrgId } from "@/lib/org";
import { startOfMonth, startOfYear, format, parseISO } from "date-fns";
import Link from "next/link";
import { AnimatedStatCard } from "@/components/animated-stat-card";
import { PerformanceKpi } from "@/components/charts/performance-kpi";

function fmtUSD(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${(n * 100).toFixed(2)}%`;
}

export default async function MarketDeskOverview() {
  const orgId = await getActiveOrgId();
  if (!orgId) return <div className="text-slate-600 dark:text-slate-400">No active organization.</div>;

  const today = new Date();
  const monthStart = startOfMonth(today);
  const yearStart = startOfYear(today);

  // Fetch current month P&L, YTD P&L, latest NAV, and recent P&L entries
  const [currentMonthPnl, ytdPnl, latestNav, latestUnrealizedEntry, recentPnlEntries] = await Promise.all([
    // Current month P&L
    prisma.dailyPnl.findMany({
      where: { orgId, date: { gte: monthStart } },
      select: { realizedPnl: true, unrealizedPnl: true },
    }),
    // YTD P&L
    prisma.dailyPnl.findMany({
      where: { orgId, date: { gte: yearStart } },
      select: { realizedPnl: true },
    }),
    // Latest month-end NAV
    prisma.monthlyNavEom.findFirst({
      where: { orgId },
      orderBy: { date: "desc" },
      select: { nav: true, date: true },
    }),
    // Latest unrealized P&L (most recent daily entry)
    prisma.dailyPnl.findFirst({
      where: { orgId },
      orderBy: { date: "desc" },
      select: { unrealizedPnl: true, date: true },
    }),
    // Recent P&L entries (last 5 days)
    prisma.dailyPnl.findMany({
      where: { orgId },
      orderBy: { date: "desc" },
      take: 5,
      select: { id: true, date: true, realizedPnl: true, unrealizedPnl: true, note: true },
    }),
  ]);

  // Calculate current month stats
  const mtdRealized = currentMonthPnl.reduce((sum, p) => sum + Number(p.realizedPnl), 0);
  const currentUnrealized = latestUnrealizedEntry ? Number(latestUnrealizedEntry.unrealizedPnl) : 0;
  // Format date in UTC to avoid timezone shift issues
  const unrealizedDate = latestUnrealizedEntry
    ? format(parseISO(latestUnrealizedEntry.date.toISOString().split('T')[0]), "MMM d, yyyy")
    : null;
  const daysTraded = currentMonthPnl.filter(p => Number(p.realizedPnl) !== 0).length;

  // Calculate YTD stats
  const ytdRealized = ytdPnl.reduce((sum, p) => sum + Number(p.realizedPnl), 0);

  // Latest NAV info
  const navValue = latestNav ? Number(latestNav.nav) : null;
  // Format date in UTC to avoid timezone shift issues
  const navDate = latestNav
    ? format(parseISO(latestNav.date.toISOString().split('T')[0]), "MMM d, yyyy")
    : null;

  const profit = mtdRealized > 0;
  const loss = mtdRealized < 0;

  return (
    <div className="space-y-6">

      {/* 1. Performance KPIs (Sharpe, Sortino, Win Rate) - The "Pulse" */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-slate-900 dark:text-slate-100">Performance Health</h2>
        <PerformanceKpi orgId={orgId} />
      </div>

      {/* 2. Key Financial Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-slate-900 dark:text-slate-100">Financial Overview</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <AnimatedStatCard
            label="MTD Realized P&L"
            value={fmtUSD(mtdRealized)}
            rawValue={mtdRealized}
            isCurrency={true}
            tone={profit ? "pos" : loss ? "neg" : undefined}
            subtitle="Realized this month"
          />
          <AnimatedStatCard
            label="Current Unrealized P&L"
            value={fmtUSD(currentUnrealized)}
            rawValue={currentUnrealized}
            isCurrency={true}
            subtitle={unrealizedDate ? `as of ${unrealizedDate}` : undefined}
            tone={currentUnrealized > 0 ? "pos" : currentUnrealized < 0 ? "neg" : undefined}
          />
          <AnimatedStatCard
            label="YTD Realized P&L"
            value={fmtUSD(ytdRealized)}
            rawValue={ytdRealized}
            isCurrency={true}
            tone={ytdRealized > 0 ? "pos" : ytdRealized < 0 ? "neg" : undefined}
          />
          <AnimatedStatCard
            label="Latest NAV"
            value={navValue != null ? fmtUSD(navValue) : "—"}
            rawValue={navValue ?? undefined}
            isCurrency={true}
            subtitle={navDate ? `as of ${navDate}` : undefined}
          />
        </div>
      </div>

      {/* 3. Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent P&L Entries */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Trading Activity</h2>
            <Link href="/market-desk/journal" className="text-sm text-gold-600 dark:text-gold-400 hover:underline">
              View all →
            </Link>
          </div>
          <div className="card divide-y dark:divide-slate-700">
            {recentPnlEntries.length === 0 && (
              <div className="p-4 text-center text-slate-500 dark:text-slate-400">No trading activity yet</div>
            )}
            {recentPnlEntries.map((entry) => {
              const realized = Number(entry.realizedPnl);
              const isPositive = realized > 0;
              const isNegative = realized < 0;
              return (
                <div key={entry.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {format(parseISO(entry.date.toISOString().split('T')[0]), "MMM d")}
                      </div>
                      <div className={`text-lg font-bold ${isPositive ? "text-emerald-600 dark:text-emerald-400" :
                        isNegative ? "text-red-600 dark:text-red-400" :
                          "text-slate-600 dark:text-slate-400"
                        }`}>
                        {isPositive ? "+" : ""}{fmtUSD(realized)}
                      </div>
                    </div>
                    {entry.note && (
                      <div className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                        {entry.note}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions at the bottom right/side */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-slate-900 dark:text-slate-100">Quick Actions</h2>
          <div className="space-y-3">
            <QuickLink href="/market-desk/journal" label="Add Journal Entry" icon="📝" />
            <QuickLink href="/market-desk/calendar" label="View Calendar" icon="📅" />
            <QuickLink href="/market-desk/performance" label="Performance Analysis" icon="📈" />
            <QuickLink href="/market-desk/positions" label="View Positions" icon="💼" />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: any; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="card p-3 hover:shadow-lg transition-all duration-200 flex items-center gap-3 hover:border-gold-500 dark:hover:border-gold-600 hover:scale-105 transform group"
    >
      <span className="text-xl transition-transform duration-200 group-hover:scale-110">{icon}</span>
      <span className="font-medium text-slate-900 dark:text-slate-100 text-sm">{label}</span>
    </Link>
  );
}
