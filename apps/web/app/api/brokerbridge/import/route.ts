/**
 * API Route: /api/brokerbridge/import
 * Import positions from CSV or OFX file
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BrokerProvider } from "@prisma/client";
import {
  createConnection,
  syncConnection,
  AdapterError,
  type CSVImportAuthInput,
} from "@/lib/brokerbridge";

/**
 * POST /api/brokerbridge/import
 * Import positions from file
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      orgId,
      fileContent,
      fileName,
      fileType,
      accountNickname,
      columnMapping,
      asOf,
    } = body;

    if (!orgId || !fileContent || !fileName || !fileType) {
      return NextResponse.json(
        {
          error: "Missing required fields: orgId, fileContent, fileName, fileType",
        },
        { status: 400 }
      );
    }

    // Validate file type
    const broker =
      fileType === "CSV"
        ? BrokerProvider.CSV_IMPORT
        : fileType === "OFX"
        ? BrokerProvider.OFX_IMPORT
        : null;

    if (!broker) {
      return NextResponse.json(
        { error: `Invalid file type: ${fileType}. Must be CSV or OFX` },
        { status: 400 }
      );
    }

    // Prepare auth input for CSV/OFX adapter
    const authInput: CSVImportAuthInput = {
      fileContent,
      fileName,
      accountNickname,
      columnMapping,
      asOf: asOf ? new Date(asOf) : undefined,
    };

    // Create connection (which parses and validates the file)
    const userId = session.user.id;
    const { connectionId, accounts } = await createConnection(
      orgId,
      userId,
      broker,
      authInput
    );

    // Immediately sync the connection to import positions
    const syncResult = await syncConnection(connectionId);

    if (!syncResult.success) {
      return NextResponse.json(
        {
          error: "Import succeeded but sync failed",
          connectionId,
          syncError: syncResult.error?.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        connectionId,
        accounts,
        lotsImported: syncResult.lotsImported,
        instrumentsCreated: syncResult.instrumentsCreated,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Import error:", error);

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
        error: "Failed to import file",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
