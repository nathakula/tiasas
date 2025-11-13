/**
 * Sync Service
 * Orchestrates syncing positions from broker adapters to database
 */

import { prisma } from "@/lib/db";
import { BrokerProvider, BrokerConnectionStatus, AssetClass } from "@prisma/client";
import type {
  BrokerAdapter,
  NormalizedSnapshot,
  SyncResult,
  SyncOptions,
} from "../types";
import { AdapterError } from "../types";
import { getAdapter } from "../adapters";
import { mapCSVToSnapshot, validateCSVSnapshot } from "../mappers/csv-mapper";
import { redactSensitiveFields } from "../encryption";

/**
 * Sync positions for a broker connection
 */
export async function syncConnection(
  connectionId: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const startTime = new Date();
  let syncLogId: string | undefined;

  try {
    // Load connection from database
    const connection = await prisma.brokerConnection.findUnique({
      where: { id: connectionId },
      include: { accounts: true },
    });

    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    // Create sync log
    const syncLog = await prisma.syncLog.create({
      data: {
        connectionId,
        startedAt: startTime,
        result: "RUNNING",
      },
    });
    syncLogId = syncLog.id;

    // Get appropriate adapter
    const adapter = getAdapter(connection.broker);

    // Fetch accounts if not already loaded
    let accounts = connection.accounts;
    if (accounts.length === 0 || options.forceRefresh) {
      const brokerAccounts = await adapter.listAccounts(connectionId);

      // Upsert accounts in database
      for (const brokerAccount of brokerAccounts) {
        await prisma.brokerAccount.upsert({
          where: { id: brokerAccount.accountId },
          create: {
            id: brokerAccount.accountId,
            connectionId,
            nickname: brokerAccount.nickname,
            maskedNumber: brokerAccount.maskedNumber,
            accountType: brokerAccount.accountType,
          },
          update: {
            nickname: brokerAccount.nickname,
            maskedNumber: brokerAccount.maskedNumber,
            accountType: brokerAccount.accountType,
          },
        });
      }

      // Reload accounts
      accounts = await prisma.brokerAccount.findMany({
        where: { connectionId },
      });
    }

    // Sync each account
    let totalLots = 0;
    let totalInstruments = 0;
    const accountResults: Array<{ accountId: string; success: boolean; error?: string }> = [];

    for (const account of accounts) {
      try {
        const accountResult = await syncAccount(
          account.id,
          adapter,
          connection.broker,
          options
        );
        totalLots += accountResult.lotsImported || 0;
        totalInstruments += accountResult.instrumentsCreated || 0;
        accountResults.push({ accountId: account.id, success: true });

        // Update account last synced time
        await prisma.brokerAccount.update({
          where: { id: account.id },
          data: { lastSyncedAt: new Date() },
        });
      } catch (error) {
        accountResults.push({
          accountId: account.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Update connection status and last synced time
    await prisma.brokerConnection.update({
      where: { id: connectionId },
      data: {
        status: BrokerConnectionStatus.ACTIVE,
        lastSyncedAt: new Date(),
      },
    });

    // Update sync log
    await prisma.syncLog.update({
      where: { id: syncLogId },
      data: {
        finishedAt: new Date(),
        result: "SUCCESS",
        message: `Synced ${accounts.length} accounts, ${totalLots} lots, ${totalInstruments} instruments`,
      },
    });

    return {
      success: true,
      connectionId,
      lotsImported: totalLots,
      instrumentsCreated: totalInstruments,
    };
  } catch (error) {
    console.error("Sync connection error:", error);

    // Update sync log with error
    if (syncLogId) {
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          finishedAt: new Date(),
          result: "ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    // Mark connection as error
    await prisma.brokerConnection.update({
      where: { id: connectionId },
      data: { status: BrokerConnectionStatus.ERROR },
    });

    return {
      success: false,
      connectionId,
      error:
        error instanceof AdapterError
          ? error
          : AdapterError.unknown(error instanceof Error ? error.message : "Unknown error"),
    };
  }
}

/**
 * Sync positions for a single account
 */
export async function syncAccount(
  accountId: string,
  adapter: BrokerAdapter,
  broker: BrokerProvider,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const startTime = new Date();
  let syncLogId: string | undefined;

  try {
    // Create sync log
    const syncLog = await prisma.syncLog.create({
      data: {
        accountId,
        startedAt: startTime,
        result: "RUNNING",
      },
    });
    syncLogId = syncLog.id;

    // Fetch positions from adapter
    const rawPayload = await adapter.fetchPositions(accountId);

    // Map to normalized snapshot based on broker type
    let snapshot: NormalizedSnapshot;
    if (broker === BrokerProvider.CSV_IMPORT || broker === BrokerProvider.OFX_IMPORT) {
      snapshot = mapCSVToSnapshot(rawPayload, accountId);

      // Validate CSV snapshot
      const validation = validateCSVSnapshot(snapshot);
      if (!validation.valid) {
        throw new Error(`CSV validation failed: ${validation.errors.join(", ")}`);
      }
    } else {
      // For other brokers, we'll implement specific mappers later
      throw new Error(`Mapper not implemented for broker: ${broker}`);
    }

    // Persist snapshot to database
    const result = await persistSnapshot(snapshot, accountId, options);

    // Update sync log
    await prisma.syncLog.update({
      where: { id: syncLogId },
      data: {
        finishedAt: new Date(),
        result: "SUCCESS",
        message: `Synced ${result.lotsImported} lots, created ${result.instrumentsCreated} instruments`,
      },
    });

    return {
      success: true,
      accountId,
      snapshotId: result.snapshotId,
      lotsImported: result.lotsImported,
      instrumentsCreated: result.instrumentsCreated,
    };
  } catch (error) {
    console.error("Sync account error:", redactSensitiveFields({ accountId, error }));

    // Update sync log with error
    if (syncLogId) {
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          finishedAt: new Date(),
          result: "ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    return {
      success: false,
      accountId,
      error:
        error instanceof AdapterError
          ? error
          : AdapterError.unknown(error instanceof Error ? error.message : "Unknown error"),
    };
  }
}

/**
 * Persist normalized snapshot to database
 */
async function persistSnapshot(
  snapshot: NormalizedSnapshot,
  accountId: string,
  options: SyncOptions = {}
): Promise<{
  snapshotId: string;
  lotsImported: number;
  instrumentsCreated: number;
}> {
  let instrumentsCreated = 0;

  // Create position snapshot
  const positionSnapshot = await prisma.positionSnapshot.create({
    data: {
      accountId,
      asOf: snapshot.asOf,
      cashTotal: snapshot.cashTotal,
      currency: "USD",
    },
  });

  // Process each lot
  for (const lot of snapshot.lots) {
    // Ensure instrument exists
    let instrument = await prisma.instrument.findUnique({
      where: {
        symbol_exchange: {
          symbol: lot.instrument.symbol,
          exchange: lot.instrument.exchange || null,
        },
      },
    });

    if (!instrument && !options.skipInstrumentCreation) {
      // Create instrument
      instrument = await prisma.instrument.create({
        data: {
          symbol: lot.instrument.symbol,
          exchange: lot.instrument.exchange,
          name: lot.instrument.name,
          assetClass: lot.instrument.assetClass,
          currency: lot.instrument.currency,
          cusip: lot.instrument.cusip,
          isin: lot.instrument.isin,
        },
      });
      instrumentsCreated++;

      // Create option detail if applicable
      if (
        lot.instrument.assetClass === AssetClass.OPTION &&
        lot.instrument.option
      ) {
        await prisma.optionDetail.create({
          data: {
            instrumentId: instrument.id,
            right: lot.instrument.option.right,
            strike: lot.instrument.option.strike,
            expiration: lot.instrument.option.expiration,
            multiplier: lot.instrument.option.multiplier,
          },
        });
      }

      // Link underlying instrument for options
      if (lot.instrument.underlying?.symbol && instrument) {
        const underlyingInstrument = await prisma.instrument.findFirst({
          where: { symbol: lot.instrument.underlying.symbol },
        });

        if (underlyingInstrument) {
          await prisma.instrument.update({
            where: { id: instrument.id },
            data: { underlyingInstrumentId: underlyingInstrument.id },
          });
        }
      }
    }

    if (!instrument) {
      console.warn(`Skipping lot for unknown instrument: ${lot.instrument.symbol}`);
      continue;
    }

    // Calculate aggregated values for snapshot
    const marketValue = lot.marketValue || 0;
    const costBasis = lot.costBasis || 0;

    // Update snapshot totals
    await prisma.positionSnapshot.update({
      where: { id: positionSnapshot.id },
      data: {
        marketValue: { increment: marketValue },
        costBasisTotal: { increment: costBasis },
      },
    });

    // Create position lot
    await prisma.positionLot.create({
      data: {
        snapshotId: positionSnapshot.id,
        instrumentId: instrument.id,
        quantity: lot.quantity,
        averagePrice: lot.averagePrice,
        costBasis: lot.costBasis,
        marketPrice: lot.lastPrice,
        marketValue: lot.marketValue,
        unrealizedPL: lot.unrealizedPL,
        unrealizedPLPct: lot.unrealizedPLPct,
        basisMethod: lot.basisMethod || "UNKNOWN",
        metadata: lot.metadata || {},
      },
    });
  }

  return {
    snapshotId: positionSnapshot.id,
    lotsImported: snapshot.lots.length,
    instrumentsCreated,
  };
}

/**
 * Get sync status for a connection
 */
export async function getSyncStatus(connectionId: string) {
  const connection = await prisma.brokerConnection.findUnique({
    where: { id: connectionId },
    include: {
      accounts: {
        include: {
          positionSnapshots: {
            orderBy: { asOf: "desc" },
            take: 1,
          },
        },
      },
      syncLogs: {
        orderBy: { startedAt: "desc" },
        take: 5,
      },
    },
  });

  if (!connection) {
    return null;
  }

  return {
    connectionId: connection.id,
    broker: connection.broker,
    status: connection.status,
    lastSyncedAt: connection.lastSyncedAt,
    accounts: connection.accounts.map((account) => ({
      id: account.id,
      nickname: account.nickname,
      lastSyncedAt: account.lastSyncedAt,
      latestSnapshot: account.positionSnapshots[0] || null,
    })),
    recentSyncs: connection.syncLogs.map((log) => ({
      id: log.id,
      startedAt: log.startedAt,
      finishedAt: log.finishedAt,
      result: log.result,
      message: log.message,
    })),
  };
}
