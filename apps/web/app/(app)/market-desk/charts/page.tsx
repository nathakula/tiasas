import { prisma } from "@/lib/db";
import { getActiveOrgId } from "@/lib/org";
import { format } from "date-fns";
import { MonthlyPnlChart, NavByMonthChart, YtdCards } from "./charts_widgets";
import { MonthBanner } from "@/components/month-banner";

export default async function ChartsPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) return <div>No active org.</div>;
  const daily = await prisma.dailyPnl.findMany({ where: { orgId }, orderBy: { date: "asc" } });
  const monthly = aggregateMonthly(daily.map((d) => ({
    date: d.date,
    realizedPnl: Number(d.realizedPnl),
    navEnd: Number(d.navEnd),
  })));
  const latest = monthly.at(-1);
  return (
    <div className="space-y-6">
      {latest && (
        <MonthBanner
          month={latest.month}
          realized={latest.realized}
          endNav={latest.navEnd}
          navChange={undefined as any}
          returnPct={undefined as any}
          unrealizedSnapshot={null}
        />
      )}
      <YtdCards monthly={monthly} />
      <div className="card p-4">
        <div className="font-medium mb-2">Monthly Realized P&L</div>
        <MonthlyPnlChart monthly={monthly} />
      </div>
      <div className="card p-4">
        <div className="font-medium mb-2">NAV by Month</div>
        <NavByMonthChart monthly={monthly} />
      </div>
    </div>
  );
}

function aggregateMonthly(rows: { date: Date; realizedPnl: number; navEnd: number }[]) {
  const map = new Map<string, { month: string; realized: number; navEnd: number }>();
  for (const r of rows) {
    const m = format(r.date, "yyyy-MM");
    const ex = map.get(m) ?? { month: m, realized: 0, navEnd: r.navEnd };
    ex.realized += r.realizedPnl;
    ex.navEnd = r.navEnd; // last of month ok
    map.set(m, ex);
  }
  return Array.from(map.values());
}
