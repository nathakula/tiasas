import type { QuickScanResult, DeepDiveResult, MacroResult } from "./types";

export function quickScanPrompt(input: { ticker: string; window: string; dataJson: any }) {
  return `Task: Produce a Layer-1 quick scan for a single ticker.
Return JSON matching QuickScanResult.

Inputs:
- Ticker: ${input.ticker}
- Window: ${input.window}
- Data snapshot: ${JSON.stringify(input.dataJson)}

Rules:
- Identify 2-4 support levels and 2-4 resistance levels based on recent swing highs/lows.
- Give 2 short entry ideas and 2 exit ideas tied to those levels.
- Include range stats for 1m, 3m, 6m, 1y if provided.
- List catalysts if present. If unknown, leave empty.
- Keep macroNote to one sentence.
- Always set disclaimer as: "For research only. Not investment advice."`;
}

export function deepDivePrompt(input: { ticker: string; focus?: string; dataJson: any }) {
  return `Task: Produce a structured Layer-2 analysis.
Return JSON matching DeepDiveResult.

Inputs:
- Ticker: ${input.ticker}
- Focus: ${input.focus ?? "-"}
- Data snapshot: ${JSON.stringify(input.dataJson)}

Rules:
- Overview: plain description of the business and revenue drivers.
- RecentResults: 3-6 bullets with specific numbers from the snapshot.
- TechnicalZones: 3-5 support/resistance; add a momentum note if snapshot includes it.
- ValuationContext: state multiples and relative vs comps.
- Risks: at least three items.
- AlternativeCases: one upside, one downside.
- Checklist: 5-8 yes/no checks.
- Always set disclaimer as: "For research only. Not investment advice."`;
}

export function macroPrompt(input: { watchlist: string[]; calendarJson: any }) {
  return `Task: Provide a short market context for the week.
Return JSON matching MacroResult.

Inputs:
- Watchlist: ${input.watchlist.join(', ')}
- Calendar snapshot: ${JSON.stringify(input.calendarJson)}

Rules:
- Summary: two short paragraphs max.
- WeekAhead: date-labeled items from the calendar.
- Add 1-3 watchouts.
- Always set disclaimer as: "For research only. Not investment advice."`;
}

export const systemGuard = `You are an assistant that returns ONLY valid JSON matching the requested TypeScript types. Do not include backticks or extra text.`;

