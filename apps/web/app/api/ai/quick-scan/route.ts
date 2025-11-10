import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import type { QuickScanResult } from "@/lib/ai/types";
import { chatJson } from "@/lib/ai/provider";
import { quickScanPrompt, systemGuard } from "@/lib/ai/prompts";

const Schema = z.object({ ticker: z.string().min(1), window: z.enum(["1m","3m","6m","1y"]).default("3m") });

export async function POST(req: Request) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { ticker, window } = parsed.data;

  const dataJson = { lastPrice: null, highs: [], lows: [], earnings: null, catalysts: [] };
  try {
    const prompt = quickScanPrompt({ ticker, window, dataJson });
    const result = await chatJson<QuickScanResult>({ system: systemGuard, user: prompt });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "LLM failed" }, { status: 500 });
  }
}
