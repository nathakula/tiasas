/**
 * API Route: /api/brokerbridge/connections/[id]
 * Get or delete a specific connection
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getConnection, deleteConnection } from "@/lib/brokerbridge";

/**
 * GET /api/brokerbridge/connections/[id]
 * Get connection details
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connectionId = params.id;
    const connection = await getConnection(connectionId, (session.user as any).id);

    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ connection });
  } catch (error) {
    console.error("Get connection error:", error);
    return NextResponse.json(
      {
        error: "Failed to get connection",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/brokerbridge/connections/[id]
 * Delete a connection
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connectionId = params.id;
    await deleteConnection(connectionId, (session.user as any).id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete connection error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete connection",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
