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
      const mRes = await fetch(`/api/pnl/monthly?from=${from}&to=${to}`).then((r) => r.json());
      const m = (mRes.months || [])[0] ?? null;
      if (m) setData(m);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) return null;
  return <MonthBanner month={data.month} realized={data.realized} endNav={data.endNav} prevEndNav={data.prevEndNav} navChange={data.navChange} returnPct={data.returnPct} unrealizedSnapshot={data.unrealizedSnapshot} />;
}
