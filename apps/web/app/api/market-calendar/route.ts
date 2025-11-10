import { NextResponse } from "next/server";
import { usMarketHolidayMap } from "@/lib/market-calendar";
import fs from "node:fs";
import path from "node:path";

type Kind = "HOLIDAY" | "EARLY_CLOSE";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();

  const algo = usMarketHolidayMap(year);
  const fromCsv = readCsvOverrides(year);
  const merged: Record<string, { name: string; type: Kind }> = { ...algo, ...fromCsv } as any;
  return NextResponse.json({ year, days: merged });
}

function readCsvOverrides(year: number): Record<string, { name: string; type: Kind }> {
  try {
    const file = path.join(process.cwd(), "apps", "web", "data", "market_calendar.csv");
    if (!fs.existsSync(file)) return {};
    const raw = fs.readFileSync(file, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const out: Record<string, { name: string; type: Kind }> = {};
    for (let i = 1; i < lines.length; i++) {
      const [date, name, type] = lines[i].split(",");
      if (!date || !name || !type) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (!["HOLIDAY", "EARLY_CLOSE"].includes(type)) continue;
      if (Number(date.slice(0, 4)) !== year) continue;
      out[date] = { name, type: type as Kind };
    }
    return out;
  } catch {
    return {};
  }
}

