/**
 * Connection Service
 * Manages broker connections and authentication
 */

import { prisma } from "@/lib/db";
import { BrokerProvider, BrokerConnectionStatus } from "@prisma/client";
import type { BrokerAuthInput } from "../types";
import { AdapterError } from "../types";
import { getAdapter, hasAdapter } from "../adapters";
import { encryptCredentials, decryptCredentials, generateUserSalt } from "../encryption";

/**
 * Create a new broker connection
 */
export async function createConnection(
  orgId: string,
  userId: string,
  broker: BrokerProvider,
  authInput: BrokerAuthInput,
  brokerSource?: string
): Promise<{
  connectionId: string;
  accounts: Array<{ id: string; nickname?: string }>;
}> {
  // Validate broker is supported
  if (!hasAdapter(broker)) {
    throw new Error(`Broker not supported: ${broker}`);
  }

  try {
    // Get adapter and attempt connection
    const adapter = getAdapter(broker);
    const { connectionId } = await adapter.connect(authInput);

    // For CSV imports, connectionId is synthetic; for API brokers, it's the broker's connection ID
    // We'll generate our own DB connection ID
    const dbConnectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Encrypt auth credentials
    // For CSV/OFX imports, we store the file content so it can be used during sync
    const userSalt = generateUserSalt();
    const encryptedAuth = encryptCredentials(authInput, userSalt);

    // Create connection in database
    const connection = await prisma.brokerConnection.create({
      data: {
        id: dbConnectionId,
        orgId,
        userId,
        broker,
        brokerSource,
        status: BrokerConnectionStatus.ACTIVE,
        encryptedAuth: { encrypted: encryptedAuth },
      },
    });

    // Fetch and create accounts
    const brokerAccounts = await adapter.listAccounts(connectionId);
    const accounts = await Promise.all(
      brokerAccounts.map(async (brokerAccount) => {
        const account = await prisma.brokerAccount.create({
          data: {
            id: brokerAccount.accountId,
            connectionId: connection.id,
            nickname: brokerAccount.nickname,
            maskedNumber: brokerAccount.maskedNumber,
            accountType: brokerAccount.accountType,
          },
        });
        return {
          id: account.id,
          nickname: account.nickname || undefined,
        };
      })
    );

    return {
      connectionId: connection.id,
      accounts,
    };
  } catch (error) {
    console.error("Create connection error:", error);

    if (error instanceof AdapterError) {
      throw error;
    }

    throw AdapterError.unknown(
      error instanceof Error ? error.message : "Failed to create connection"
    );
  }
}

/**
 * Delete a broker connection
 */
export async function deleteConnection(
  connectionId: string,
  userId: string
): Promise<void> {
  // Verify user owns this connection
  const connection = await prisma.brokerConnection.findFirst({
    where: {
      id: connectionId,
      userId,
    },
  });

  if (!connection) {
    throw new Error("Connection not found or access denied");
  }

  // Delete connection (cascades to accounts, snapshots, lots, etc.)
  await prisma.brokerConnection.delete({
    where: { id: connectionId },
  });
}

/**
 * List all connections for an organization
 */
export async function listConnections(orgId: string) {
  const connections = await prisma.brokerConnection.findMany({
    where: { orgId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      accounts: {
        select: {
          id: true,
          nickname: true,
          maskedNumber: true,
          accountType: true,
          lastSyncedAt: true,
        },
      },
      syncLogs: {
        orderBy: { startedAt: "desc" },
        take: 1,
        select: {
          startedAt: true,
          finishedAt: true,
          result: true,
          message: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return connections.map((conn) => ({
    id: conn.id,
    broker: conn.broker,
    status: conn.status,
    lastSyncedAt: conn.lastSyncedAt,
    createdAt: conn.createdAt,
    createdBy: {
      id: conn.user.id,
      name: conn.user.name,
      email: conn.user.email,
    },
    accounts: conn.accounts,
    lastSync: conn.syncLogs[0] || null,
  }));
}

/**
 * Get connection details
 */
export async function getConnection(connectionId: string, userId?: string) {
  const where: { id: string; userId?: string } = { id: connectionId };
  if (userId) {
    where.userId = userId;
  }

  const connection = await prisma.brokerConnection.findFirst({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      accounts: {
        include: {
          positionSnapshots: {
            orderBy: { asOf: "desc" },
            take: 5,
            select: {
              id: true,
              asOf: true,
              cashTotal: true,
              marketValue: true,
              costBasisTotal: true,
              currency: true,
            },
          },
        },
      },
      syncLogs: {
        orderBy: { startedAt: "desc" },
        take: 10,
      },
    },
  });

  if (!connection) {
    return null;
  }

  return {
    id: connection.id,
    broker: connection.broker,
    status: connection.status,
    lastSyncedAt: connection.lastSyncedAt,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
    createdBy: {
      id: connection.user.id,
      name: connection.user.name,
      email: connection.user.email,
    },
    accounts: connection.accounts.map((account) => ({
      id: account.id,
      nickname: account.nickname,
      maskedNumber: account.maskedNumber,
      accountType: account.accountType,
      lastSyncedAt: account.lastSyncedAt,
      recentSnapshots: account.positionSnapshots,
    })),
    recentSyncs: connection.syncLogs,
  };
}

/**
 * Test a broker connection (for existing connections)
 */
export async function testConnection(connectionId: string): Promise<boolean> {
  const connection = await prisma.brokerConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new Error("Connection not found");
  }

  try {
    const adapter = getAdapter(connection.broker);

    // If adapter supports testConnection, use it
    if (adapter.testConnection) {
      return await adapter.testConnection(connectionId);
    }

    // Otherwise, try fetching accounts as a test
    await adapter.listAccounts(connectionId);
    return true;
  } catch (error) {
    console.error("Test connection error:", error);
    return false;
  }
}

/**
 * Reconnect an expired or errored connection
 */
export async function reconnectConnection(
  connectionId: string,
  userId: string,
  newAuthInput: BrokerAuthInput
): Promise<void> {
  const connection = await prisma.brokerConnection.findFirst({
    where: {
      id: connectionId,
      userId,
    },
  });

  if (!connection) {
    throw new Error("Connection not found or access denied");
  }

  try {
    // Test new credentials
    const adapter = getAdapter(connection.broker);
    await adapter.connect(newAuthInput);

    // Encrypt and update credentials
    const userSalt = generateUserSalt();
    const encryptedAuth = encryptCredentials(newAuthInput, userSalt);

    await prisma.brokerConnection.update({
      where: { id: connectionId },
      data: {
        encryptedAuth: { encrypted: encryptedAuth },
        status: BrokerConnectionStatus.ACTIVE,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    // Mark connection as error
    await prisma.brokerConnection.update({
      where: { id: connectionId },
      data: { status: BrokerConnectionStatus.ERROR },
    });

    throw error;
  }
}
