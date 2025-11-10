"use client";
import { useEffect, useState } from "react";
import { MonthBanner } from "@/components/month-banner";

export default function JournalSummaryClient() {
  const [data, setData] = useState<any | null>(null);
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const from = `${yyyy}-${mm}-01`;
  const to = `${yyyy}-${mm}-31`;

  useEffect(() => {
    async function load() {
      const [mRes, dRes] = await Promise.all([
        fetch(`/api/pnl/monthly?from=${from}&to=${to}`).then((r) => r.json()),
        fetch(`/api/pnl/daily?from=${from}&to=${to}`).then((r) => r.json()),
      ]);
      const m = (mRes.months || [])[0] ?? null;
      const navSeries = Array.isArray(dRes)
        ? dRes.map((r: any) => ({ date: String(r.date).slice(8, 10), nav: Number(r.navEnd ?? 0) })).filter((p: any) => !Number.isNaN(p.nav))
        : [];
      if (m) setData({ ...m, navSeries });
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) return null;
  return (
    <MonthBanner
      month={data.month}
      realized={data.realized}
      endNav={data.endNav}
      navChange={data.navChange}
      returnPct={data.returnPct}
      unrealizedSnapshot={data.unrealizedSnapshot}
      navSeries={data.navSeries}
    />
  );
}

