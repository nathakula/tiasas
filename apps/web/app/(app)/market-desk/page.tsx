import { prisma } from "@/lib/db";
import { getActiveOrgId } from "@/lib/org";
import { startOfMonth, startOfYear, format, parseISO } from "date-fns";
import Link from "next/link";

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

  // Fetch current month P&L, YTD P&L, latest NAV, and recent journal entries
  const [currentMonthPnl, ytdPnl, latestNav, latestUnrealizedEntry, recentEntries, entriesCount] = await Promise.all([
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
    // Recent journal entries
    prisma.journalEntry.findMany({
      where: { orgId },
      orderBy: { date: "desc" },
      take: 5,
      select: { id: true, date: true, text: true, tags: true },
    }),
    // Total journal entries
    prisma.journalEntry.count({ where: { orgId } }),
  ]);

  // Calculate current month stats
  const mtdRealized = currentMonthPnl.reduce((sum, p) => sum + Number(p.realizedPnl), 0);
  const currentUnrealized = latestUnrealizedEntry ? Number(latestUnrealizedEntry.unrealizedPnl) : 0;
  // Format date in UTC to avoid timezone shift issues
  const unrealizedDate = latestUnrealizedEntry
    ? format(parseISO(latestUnrealizedEntry.date.toISOString().split('T')[0]), "MMM d, yyyy")
    : null;
  const daysTraded = currentMonthPnl.filter(p => Number(p.realizedPnl) !== 0).length;
  const winDays = currentMonthPnl.filter(p => Number(p.realizedPnl) > 0).length;
  const winRate = daysTraded > 0 ? winDays / daysTraded : null;

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
      {/* Current Month Performance */}
      <div>
        <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-slate-100">Current Month Performance</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <StatCard
            label="MTD Realized P&L"
            value={fmtUSD(mtdRealized)}
            tone={profit ? "pos" : loss ? "neg" : undefined}
            subtitle="Total realized profit/loss this month"
          />
          <StatCard
            label="Current Unrealized P&L"
            value={fmtUSD(currentUnrealized)}
            subtitle={unrealizedDate ? `as of ${unrealizedDate}` : undefined}
            tone={currentUnrealized > 0 ? "pos" : currentUnrealized < 0 ? "neg" : undefined}
          />
          <StatCard
            label="Days Traded"
            value={daysTraded.toString()}
            subtitle="Days with realized P&L this month"
          />
          <StatCard
            label="Win Rate"
            value={winRate != null ? fmtPct(winRate) : "—"}
            tone={winRate != null && winRate >= 0.5 ? "pos" : winRate != null ? "neg" : undefined}
            subtitle="Winning days / total days traded"
          />
        </div>
      </div>

      {/* YTD & NAV */}
      <div>
        <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-slate-100">Portfolio Overview</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <StatCard
            label="YTD Realized P&L"
            value={fmtUSD(ytdRealized)}
            tone={ytdRealized > 0 ? "pos" : ytdRealized < 0 ? "neg" : undefined}
          />
          <StatCard
            label="Latest NAV"
            value={navValue != null ? fmtUSD(navValue) : "—"}
            subtitle={navDate ? `as of ${navDate}` : undefined}
          />
          <StatCard
            label="Total Journal Entries"
            value={entriesCount.toString()}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Recent Journal Entries</h2>
          <Link href="/market-desk/journal" className="text-sm text-gold-600 dark:text-gold-400 hover:underline">
            View all →
          </Link>
        </div>
        <div className="card divide-y dark:divide-slate-700">
          {recentEntries.length === 0 && (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400">No journal entries yet</div>
          )}
          {recentEntries.map((entry) => (
            <div key={entry.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {entry.text}
                  </div>
                  {entry.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-block px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {format(entry.date, "MMM d")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-slate-100">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <QuickLink href="/market-desk/journal" label="Add Journal Entry" icon="📝" />
          <QuickLink href="/market-desk/calendar" label="View Calendar" icon="📅" />
          <QuickLink href="/market-desk/charts" label="View Charts" icon="📊" />
          <QuickLink href="/market-desk/connections" label="Broker Connections" icon="🔗" />
          <QuickLink href="/market-desk/positions" label="View Positions" icon="💼" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  tone
}: {
  label: string;
  value: string;
  subtitle?: string;
  tone?: "pos" | "neg";
}) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${tone === "pos" ? "text-emerald-700 dark:text-emerald-400" : tone === "neg" ? "text-red-700 dark:text-red-400" : "text-slate-900 dark:text-slate-100"}`}>
        {value}
      </div>
      {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</div>}
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: any; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3 hover:border-gold-500 dark:hover:border-gold-600"
    >
      <span className="text-2xl">{icon}</span>
      <span className="font-medium text-slate-900 dark:text-slate-100">{label}</span>
    </Link>
  );
}
