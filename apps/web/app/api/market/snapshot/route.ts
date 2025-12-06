import { NextResponse } from "next/server";
import { getSnapshot } from "@tiasas/core/src/market/yahoo";

export const revalidate = 60; // 1 minute cache for snapshot

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = (searchParams.get("ticker") || searchParams.get("t") || "").toUpperCase();
  if (!ticker) return NextResponse.json({ error: "Missing ticker" }, { status: 400 });
  try {
    const snap = await getSnapshot(ticker);
    return NextResponse.json({ ticker, snapshot: snap });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Snapshot failed" }, { status: 500 });
  }
}

