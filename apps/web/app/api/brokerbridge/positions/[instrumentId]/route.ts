/**
 * API Route: /api/brokerbridge/positions/[instrumentId]
 * Get detailed position information for a specific instrument
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPositionDetails } from "@tiasas/core/src/brokerbridge";

/**
 * GET /api/brokerbridge/positions/[instrumentId]
 * Get position details for a specific instrument
 */
export async function GET(
  request: Request,
  { params }: { params: { instrumentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get("orgId");
    if (!orgId) {
      return NextResponse.json(
        { error: "Missing orgId parameter" },
        { status: 400 }
      );
    }

    const asOf = searchParams.get("asOf");
    const asOfDate = asOf ? new Date(asOf) : undefined;

    const instrumentId = params.instrumentId;
    const details = await getPositionDetails(orgId, instrumentId, asOfDate);

    if (!details) {
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(details);
  } catch (error) {
    console.error("Get position details error:", error);
    return NextResponse.json(
      {
        error: "Failed to get position details",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
