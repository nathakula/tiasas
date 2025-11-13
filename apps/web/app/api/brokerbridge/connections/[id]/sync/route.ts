/**
 * API Route: /api/brokerbridge/connections/[id]/sync
 * Trigger sync for a connection
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncConnection, AdapterError } from "@/lib/brokerbridge";

/**
 * POST /api/brokerbridge/connections/[id]/sync
 * Trigger a sync for this connection
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connectionId = params.id;

    // Parse optional sync options
    const body = await request.json().catch(() => ({}));
    const options = {
      forceRefresh: body.forceRefresh || false,
      skipInstrumentCreation: body.skipInstrumentCreation || false,
    };

    const result = await syncConnection(connectionId, options);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Sync failed",
          message: result.error?.message || "Unknown error",
          code: result.error?.code,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      connectionId: result.connectionId,
      lotsImported: result.lotsImported,
      instrumentsCreated: result.instrumentsCreated,
    });
  } catch (error) {
    console.error("Sync connection error:", error);

    if (error instanceof AdapterError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to sync connection",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
