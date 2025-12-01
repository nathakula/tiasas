/**
 * API Route: /api/brokerbridge/connections
 * List and create broker connections
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BrokerProvider } from "@prisma/client";
import {
  listConnections,
  createConnection,
  AdapterError,
} from "@/lib/brokerbridge";

/**
 * GET /api/brokerbridge/connections
 * List all connections for the organization
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get org ID from session (assuming first membership)
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId parameter" }, { status: 400 });
    }

    const connections = await listConnections(orgId);

    return NextResponse.json({ connections });
  } catch (error) {
    console.error("List connections error:", error);
    return NextResponse.json(
      {
        error: "Failed to list connections",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/brokerbridge/connections
 * Create a new broker connection
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orgId, broker, authInput } = body;

    if (!orgId || !broker || !authInput) {
      return NextResponse.json(
        { error: "Missing required fields: orgId, broker, authInput" },
        { status: 400 }
      );
    }

    // Validate broker is a valid enum value
    if (!Object.values(BrokerProvider).includes(broker)) {
      return NextResponse.json(
        { error: `Invalid broker: ${broker}` },
        { status: 400 }
      );
    }

    // Get user ID from session
    const userId = (session.user as any).id;

    const result = await createConnection(orgId, userId, broker, authInput);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create connection error:", error);

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
        error: "Failed to create connection",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
