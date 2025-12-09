
import { authOptions } from "@/lib/auth";
import { db } from "@tiasas/database";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { logDebug, logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startStr = searchParams.get("start") || searchParams.get("from");
    const endStr = searchParams.get("end") || searchParams.get("to");
    let orgId = searchParams.get("orgId");

    if (!orgId) {
      const membership = await db.membership.findFirst({
        where: { userId: (session.user as any).id }, // Fix TS error
        select: { orgId: true }
      });
      orgId = membership?.orgId || null;
    }

    if (!orgId) {
      return new NextResponse("No Organization Found", { status: 400 });
    }

    if (!startStr || !endStr) {
      return new NextResponse("Missing start or end date", { status: 400 });
    }

    const startDate = new Date(startStr);
    const endDate = new Date(endStr);

    const dailyPnl = await db.dailyPnl.findMany({
      where: {
        orgId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        realizedPnl: true,
        unrealizedPnl: true,
        totalEquity: true,
        note: true
      }
    });

    // Log raw Prisma response for December records
    const decemberRecords = dailyPnl.filter(d => d.date >= new Date('2025-12-01') && d.date < new Date('2025-12-10'));
    if (decemberRecords.length > 0) {
      logDebug("PNL_DAILY_GET", "December raw Prisma data:", {
        count: decemberRecords.length,
        records: decemberRecords.map(d => ({
          date: d.date.toISOString(),
          totalEquity: d.totalEquity?.toString() || 'NULL',
          totalEquityType: typeof d.totalEquity
        }))
      });
    }

    const data = dailyPnl.map(d => ({
      date: d.date.toISOString(),
      realizedPnl: Number(d.realizedPnl),
      unrealizedPnl: Number(d.unrealizedPnl),
      totalEquity: d.totalEquity ? Number(d.totalEquity) : null,
      note: d.note ?? null
    }));

    logDebug("PNL_DAILY_GET", `Returning ${data.length} records from ${startStr} to ${endStr}`, {
      count: data.length,
      sample: data.length > 0 ? data[0] : null
    });

    return NextResponse.json(data);

  } catch (error) {
    logError("PNL_DAILY_GET", "Error fetching daily PnL", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { date, realizedPnl, unrealizedPnl, totalEquity, note } = body;

    logDebug("PNL_DAILY_POST", "Received request body", body);
    logDebug("PNL_DAILY_POST", `totalEquity value: ${totalEquity}, type: ${typeof totalEquity}`);

    let orgId = (session.user as any).orgId;
    if (!orgId) {
      // Fallback look up
      const membership = await db.membership.findFirst({
        where: { userId: (session.user as any).id },
        select: { orgId: true }
      });
      orgId = membership?.orgId;
    }

    if (!orgId) return new NextResponse("No Org", { status: 400 });

    // Validate
    if (!date || realizedPnl === undefined) {
      return new NextResponse("Missing date or realizedPnl", { status: 400 });
    }

    const d = new Date(date);

    // Upsert
    const upsertData = {
      orgId,
      date: d.toISOString(),
      realizedPnl,
      unrealizedPnl: unrealizedPnl ?? 0,
      totalEquity: totalEquity ?? null,
      note
    };
    logDebug("PNL_DAILY_POST", "About to upsert with:", upsertData);

    const entry = await db.dailyPnl.upsert({
      where: {
        orgId_date: {
          orgId,
          date: d
        }
      },
      create: {
        orgId,
        date: d,
        realizedPnl: realizedPnl,
        unrealizedPnl: unrealizedPnl ?? 0,
        totalEquity: totalEquity ?? null,
        note: note
      },
      update: {
        realizedPnl: realizedPnl,
        unrealizedPnl: unrealizedPnl ?? 0,
        totalEquity: totalEquity ?? null,
        note: note
      }
    });

    logDebug("PNL_DAILY_POST", "Successfully upserted entry", {
      id: entry.id,
      date: entry.date,
      realizedPnl: entry.realizedPnl.toString(),
      unrealizedPnl: entry.unrealizedPnl.toString(),
      totalEquity: entry.totalEquity?.toString() ?? null,
      note: entry.note
    });

    return NextResponse.json(entry);

  } catch (error) {
    logError("PNL_DAILY_POST", "Error during upsert", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
