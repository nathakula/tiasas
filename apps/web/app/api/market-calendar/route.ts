import { NextResponse } from "next/server";
import { usMarketHolidayMap } from "@tiasas/core/src/market/market-calendar";
import fs from "node:fs";
import path from "node:path";

type Kind = "HOLIDAY" | "EARLY_CLOSE";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();

  const algo = usMarketHolidayMap(year) as Record<string, { name: string; type: Kind }>;
  const fromCsv = readCsvOverrides(year);
  const merged: Record<string, { name: string; type: Kind }> = { ...algo, ...fromCsv } as any;
  const response = NextResponse.json({ year, days: merged });
  // Cache for 1 day since market calendar rarely changes
  response.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800');
  return response;
}

function readCsvOverrides(year: number): Record<string, { name: string; type: Kind }> {
  try {
    const dataDir = path.join(process.cwd(), "apps", "web", "data");
    const candidates = [
      path.join(dataDir, "market_calendar.csv"),
      path.join(dataDir, "market-calendar.csv"),
    ];
    const file = candidates.find((p) => fs.existsSync(p));
    if (!file) return {};
    let raw = fs.readFileSync(file, "utf8");
    // Strip BOM if present
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const lines = raw
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0 && !l.trim().startsWith("#"));
    const header = (lines[0] ?? "").toLowerCase().replace(/\s+/g, "");
    const out: Record<string, { name: string; type: Kind }> = {};
    const parse = (line: string) => smartSplitCsv(line);
    for (let i = 1; i < lines.length; i++) {
      const cols = parse(lines[i]).map((c) => c.trim());
      let date = "";
      let name = "";
      let type: Kind = "HOLIDAY";
      if (header.includes("date,name,type")) {
        // Accept: date,name,type
        date = cols[0];
        name = cols[1];
        const t = (cols[2] || "").toUpperCase();
        type = t === "EARLY_CLOSE" ? "EARLY_CLOSE" : "HOLIDAY";
      } else if (header.includes("date,time,name")) {
        // Accept: date,time,name; any non-empty time implies early close
        date = cols[0];
        const time = (cols[1] || "").toUpperCase();
        name = cols[2];
        type = time && time !== "" && time !== "CLOSE" ? "EARLY_CLOSE" : "HOLIDAY";
      } else {
        // Fallback: date,name
        date = cols[0];
        name = cols[1];
        type = "HOLIDAY";
      }
      if (!date || !name) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (Number(date.slice(0, 4)) !== year) continue;
      out[date] = { name, type };
    }
    return out;
  } catch {
    return {};
  }
}

// Simple CSV splitter that respects quoted fields containing commas
function smartSplitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
// Ensure filesystem access works in Next.js route
export const runtime = "nodejs";
// Always read from disk (no static caching) during dev
export const dynamic = "force-dynamic";
