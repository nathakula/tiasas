/**
 * Positions Service
 * Query and aggregate position data
 */

import { prisma } from "@/lib/db";
import { AssetClass, BrokerProvider } from "@prisma/client";

export type PositionFilters = {
  orgId: string;
  broker?: BrokerProvider;
  accountId?: string;
  assetClass?: AssetClass;
  optionsOnly?: boolean;
  symbol?: string;
  asOf?: Date; // Specific snapshot date
};

export type AggregatedPosition = {
  instrument: {
    id: string;
    symbol: string;
    name: string | null;
    assetClass: AssetClass;
    exchange: string | null;
  };
  totalQuantity: number;
  totalCostBasis: number;
  totalMarketValue: number;
  totalUnrealizedPL: number;
  weightedAveragePrice: number;
  accounts: Array<{
    accountId: string;
    accountNickname: string | null;
    broker: BrokerProvider;
    brokerSource: string | null;
    quantity: number;
    averagePrice: number | null;
    marketValue: number | null;
  }>;
  optionDetails?: {
    right: string;
    strike: number;
    expiration: Date;
    multiplier: number;
    underlying: {
      symbol: string;
    };
  };
};

/**
 * Get aggregated positions across accounts
 */
export async function getAggregatedPositions(
  filters: PositionFilters
): Promise<AggregatedPosition[]> {
  const { orgId, broker, accountId, assetClass, optionsOnly, symbol, asOf } = filters;

  // Build query to find relevant snapshots
  const snapshotWhere: any = {
    account: {
      connection: {
        orgId,
      },
    },
  };

  if (broker) {
    snapshotWhere.account.connection.broker = broker;
  }

  if (accountId) {
    snapshotWhere.accountId = accountId;
  }

  // If asOf specified, find snapshot closest to that date
  // Otherwise, get latest snapshot per account
  let snapshots;
  if (asOf) {
    snapshots = await prisma.positionSnapshot.findMany({
      where: {
        ...snapshotWhere,
        asOf: {
          lte: asOf,
        },
      },
      include: {
        account: {
          include: {
            connection: true,
          },
        },
        positionLots: {
          include: {
            instrument: {
              include: {
                optionDetail: true,
                underlyingInstrument: {
                  select: {
                    symbol: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        asOf: "desc",
      },
    });

    // Take only the most recent snapshot per account
    const accountMap = new Map();
    snapshots = snapshots.filter((snapshot) => {
      if (!accountMap.has(snapshot.accountId)) {
        accountMap.set(snapshot.accountId, true);
        return true;
      }
      return false;
    });
  } else {
    // Get latest snapshot for each account
    const accounts = await prisma.brokerAccount.findMany({
      where: {
        connection: {
          orgId,
          ...(broker && { broker }),
        },
        ...(accountId && { id: accountId }),
      },
      include: {
        connection: true,
        positionSnapshots: {
          orderBy: { asOf: "desc" },
          take: 1,
          include: {
            positionLots: {
              include: {
                instrument: {
                  include: {
                    optionDetail: true,
                    underlyingInstrument: {
                      select: {
                        symbol: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    snapshots = accounts
      .map((account) => ({
        ...account.positionSnapshots[0],
        account,
      }))
      .filter((s) => s.id); // Filter out accounts with no snapshots
  }

  // Aggregate lots by instrument
  const instrumentMap = new Map<string, AggregatedPosition>();

  for (const snapshot of snapshots) {
    for (const lot of snapshot.positionLots) {
      const { instrument } = lot;

      // Apply filters
      if (assetClass && instrument.assetClass !== assetClass) continue;
      if (optionsOnly && instrument.assetClass !== AssetClass.OPTION) continue;
      if (symbol && !instrument.symbol.toUpperCase().includes(symbol.toUpperCase())) continue;

      const instrumentKey = instrument.id;

      if (!instrumentMap.has(instrumentKey)) {
        instrumentMap.set(instrumentKey, {
          instrument: {
            id: instrument.id,
            symbol: instrument.symbol,
            name: instrument.name,
            assetClass: instrument.assetClass,
            exchange: instrument.exchange,
          },
          totalQuantity: 0,
          totalCostBasis: 0,
          totalMarketValue: 0,
          totalUnrealizedPL: 0,
          weightedAveragePrice: 0,
          accounts: [],
          optionDetails:
            instrument.assetClass === AssetClass.OPTION && instrument.optionDetail
              ? {
                  right: instrument.optionDetail.right,
                  strike: Number(instrument.optionDetail.strike),
                  expiration: instrument.optionDetail.expiration,
                  multiplier: Number(instrument.optionDetail.multiplier),
                  underlying: {
                    symbol: instrument.underlyingInstrument?.symbol || "UNKNOWN",
                  },
                }
              : undefined,
        });
      }

      const aggPos = instrumentMap.get(instrumentKey)!;

      // Aggregate quantities and values
      const quantity = Number(lot.quantity);
      const costBasis = lot.costBasis ? Number(lot.costBasis) : 0;
      const marketValue = lot.marketValue ? Number(lot.marketValue) : 0;
      const unrealizedPL = lot.unrealizedPL ? Number(lot.unrealizedPL) : 0;

      aggPos.totalQuantity += quantity;
      aggPos.totalCostBasis += costBasis;
      aggPos.totalMarketValue += marketValue;
      aggPos.totalUnrealizedPL += unrealizedPL;

      // Add account detail
      aggPos.accounts.push({
        accountId: snapshot.account.id,
        accountNickname: snapshot.account.nickname,
        broker: snapshot.account.connection.broker,
        brokerSource: snapshot.account.connection.brokerSource,
        quantity,
        averagePrice: lot.averagePrice ? Number(lot.averagePrice) : null,
        marketValue: lot.marketValue ? Number(lot.marketValue) : null,
      });
    }
  }

  // Calculate weighted average price
  const positions = Array.from(instrumentMap.values());
  for (const pos of positions) {
    if (pos.totalQuantity !== 0) {
      pos.weightedAveragePrice = pos.totalCostBasis / Math.abs(pos.totalQuantity);
    }
  }

  return positions;
}

/**
 * Get position details for a specific instrument
 */
export async function getPositionDetails(
  orgId: string,
  instrumentId: string,
  asOf?: Date
) {
  const instrument = await prisma.instrument.findUnique({
    where: { id: instrumentId },
    include: {
      optionDetail: true,
      underlyingInstrument: {
        select: {
          symbol: true,
          name: true,
        },
      },
    },
  });

  if (!instrument) {
    return null;
  }

  // Find all lots for this instrument
  const lots = await prisma.positionLot.findMany({
    where: {
      instrumentId,
      snapshot: {
        account: {
          connection: {
            orgId,
          },
        },
        ...(asOf && {
          asOf: {
            lte: asOf,
          },
        }),
      },
    },
    include: {
      snapshot: {
        include: {
          account: {
            include: {
              connection: {
                select: {
                  broker: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      snapshot: {
        asOf: "desc",
      },
    },
  });

  // Group by account and take latest snapshot per account
  const accountMap = new Map();
  const filteredLots = lots.filter((lot) => {
    const accountId = lot.snapshot.account.id;
    if (!accountMap.has(accountId)) {
      accountMap.set(accountId, true);
      return true;
    }
    return false;
  });

  return {
    instrument: {
      id: instrument.id,
      symbol: instrument.symbol,
      name: instrument.name,
      assetClass: instrument.assetClass,
      exchange: instrument.exchange,
      currency: instrument.currency,
      cusip: instrument.cusip,
      isin: instrument.isin,
    },
    optionDetails: instrument.optionDetail
      ? {
          right: instrument.optionDetail.right,
          strike: Number(instrument.optionDetail.strike),
          expiration: instrument.optionDetail.expiration,
          multiplier: Number(instrument.optionDetail.multiplier),
          underlying: instrument.underlyingInstrument
            ? {
                symbol: instrument.underlyingInstrument.symbol,
                name: instrument.underlyingInstrument.name,
              }
            : null,
        }
      : null,
    lots: filteredLots.map((lot) => ({
      account: {
        id: lot.snapshot.account.id,
        nickname: lot.snapshot.account.nickname,
        broker: lot.snapshot.account.connection.broker,
      },
      snapshotDate: lot.snapshot.asOf,
      quantity: Number(lot.quantity),
      averagePrice: lot.averagePrice ? Number(lot.averagePrice) : null,
      costBasis: lot.costBasis ? Number(lot.costBasis) : null,
      marketPrice: lot.marketPrice ? Number(lot.marketPrice) : null,
      marketValue: lot.marketValue ? Number(lot.marketValue) : null,
      unrealizedPL: lot.unrealizedPL ? Number(lot.unrealizedPL) : null,
      unrealizedPLPct: lot.unrealizedPLPct ? Number(lot.unrealizedPLPct) : null,
      basisMethod: lot.basisMethod,
    })),
  };
}

/**
 * Get portfolio summary
 */
export async function getPortfolioSummary(orgId: string, asOf?: Date) {
  const positions = await getAggregatedPositions({ orgId, asOf });

  const summary = {
    totalMarketValue: 0,
    totalCostBasis: 0,
    totalUnrealizedPL: 0,
    totalCash: 0,
    positionCount: positions.length,
    byAssetClass: {} as Record<string, {
      count: number;
      marketValue: number;
      costBasis: number;
      unrealizedPL: number;
    }>,
    byBroker: {} as Record<string, {
      accountCount: number;
      marketValue: number;
    }>,
  };

  // Aggregate by asset class
  for (const pos of positions) {
    summary.totalMarketValue += pos.totalMarketValue;
    summary.totalCostBasis += pos.totalCostBasis;
    summary.totalUnrealizedPL += pos.totalUnrealizedPL;

    const assetClass = pos.instrument.assetClass;
    if (!summary.byAssetClass[assetClass]) {
      summary.byAssetClass[assetClass] = {
        count: 0,
        marketValue: 0,
        costBasis: 0,
        unrealizedPL: 0,
      };
    }

    summary.byAssetClass[assetClass].count += 1;
    summary.byAssetClass[assetClass].marketValue += pos.totalMarketValue;
    summary.byAssetClass[assetClass].costBasis += pos.totalCostBasis;
    summary.byAssetClass[assetClass].unrealizedPL += pos.totalUnrealizedPL;

    // Aggregate by broker
    for (const account of pos.accounts) {
      if (!summary.byBroker[account.broker]) {
        summary.byBroker[account.broker] = {
          accountCount: 0,
          marketValue: 0,
        };
      }
      summary.byBroker[account.broker].marketValue += account.marketValue || 0;
    }
  }

  // Get total cash from latest snapshots
  const latestSnapshots = await prisma.positionSnapshot.findMany({
    where: {
      account: {
        connection: {
          orgId,
        },
      },
      ...(asOf && {
        asOf: {
          lte: asOf,
        },
      }),
    },
    orderBy: {
      asOf: "desc",
    },
  });

  // Group by account and sum cash
  const accountCashMap = new Map();
  for (const snapshot of latestSnapshots) {
    if (!accountCashMap.has(snapshot.accountId)) {
      accountCashMap.set(snapshot.accountId, Number(snapshot.cashTotal));
    }
  }

  summary.totalCash = Array.from(accountCashMap.values()).reduce((sum, cash) => sum + cash, 0);

  // Count unique broker accounts
  const uniqueAccounts = new Set(latestSnapshots.map((s) => s.accountId));
  for (const [broker, data] of Object.entries(summary.byBroker)) {
    // This is approximate; we'd need to join to get exact count
    data.accountCount = uniqueAccounts.size;
  }

  return summary;
}
