/**
 * API Route: /api/brokerbridge/import
 * Import positions from CSV or OFX file
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BrokerProvider } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  createConnection,
  syncConnection,
  AdapterError,
  type CSVImportAuthInput,
} from "@/lib/brokerbridge";
import { encryptCredentials, generateUserSalt } from "@/lib/brokerbridge/encryption";

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

    // Get user ID from database
    console.log(`Looking up user with email: ${session.user.email}`);
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      console.log(`User not found with email: ${session.user.email}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log(`Found user with ID: ${user.id}`);

    const body = await request.json();
    const {
      orgId,
      fileContent,
      fileName,
      fileType,
      accountNickname,
      selectedBroker,
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

    // Check if there's an existing CSV/OFX connection for this org + broker source + nickname
    // This allows multiple CSV imports from different brokers
    const nickname = accountNickname || fileName.replace(/\.csv$/i, "");
    const existingConnection = await prisma.brokerConnection.findFirst({
      where: {
        orgId,
        broker,
        brokerSource: selectedBroker || "UNKNOWN",
        accounts: {
          some: {
            nickname,
          },
        },
      },
      include: { accounts: true },
    });

    let connectionId: string;
    let accounts: any[];

    if (existingConnection) {
      // Update existing connection with new file content
      console.log(`Updating existing ${fileType} connection: ${existingConnection.id} (${selectedBroker} - ${nickname})`);

      const userSalt = generateUserSalt();
      const encryptedAuth = encryptCredentials(authInput, userSalt);

      await prisma.brokerConnection.update({
        where: { id: existingConnection.id },
        data: {
          encryptedAuth: { encrypted: encryptedAuth },
          brokerSource: selectedBroker || "UNKNOWN",
        },
      });

      connectionId = existingConnection.id;
      accounts = existingConnection.accounts;
    } else {
      // Create new connection (which parses and validates the file)
      console.log(`Creating new ${fileType} connection for org: ${orgId} (${selectedBroker} - ${nickname})`);
      const result = await createConnection(orgId, user.id, broker, authInput, selectedBroker);
      connectionId = result.connectionId;
      accounts = result.accounts;
    }

    // Immediately sync the connection to import positions
    const syncResult = await syncConnection(connectionId, {
      replaceSnapshot: true, // Replace old snapshot instead of creating new one
    });

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
