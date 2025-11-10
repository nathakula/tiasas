import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";

export default async function CalendarPage() {
  const orgId = (await cookies()).get("active_org")?.value ?? null;
  if (!orgId) return <div>No active org.</div>;
  const today = new Date();
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  const [entries, trades] = await Promise.all([
    prisma.journalEntry.findMany({ where: { orgId, date: { gte: start, lte: end } } }),
    prisma.trade.findMany({ where: { orgId, date: { gte: start, lte: end } } }),
  ]);
  const days = eachDayOfInterval({ start, end });
  const byDay = new Map<string, { e: number; t: number }>();
  for (const d of days) byDay.set(format(d, "yyyy-MM-dd"), { e: 0, t: 0 });
  for (const e of entries) {
    const k = format(e.date, "yyyy-MM-dd");
    byDay.set(k, { ...(byDay.get(k) ?? { e: 0, t: 0 }), e: (byDay.get(k)?.e ?? 0) + 1 });
  }
  for (const t of trades) {
    const k = format(t.date, "yyyy-MM-dd");
    byDay.set(k, { ...(byDay.get(k) ?? { e: 0, t: 0 }), t: (byDay.get(k)?.t ?? 0) + 1 });
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => {
        const k = format(d, "yyyy-MM-dd");
        const c = byDay.get(k) ?? { e: 0, t: 0 };
        return (
          <div key={k} className="card p-2 min-h-[90px]">
            <div className="text-xs text-slate-500">{format(d, "d MMM")}</div>
            <div className="text-xs mt-2">📝 {c.e} · 🔁 {c.t}</div>
          </div>
        );
      })}
    </div>
  );
}

