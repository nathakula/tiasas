/**
 * Seed Data Generator for Onboarding
 *
 * This utility generates realistic demo data to help new users
 * explore the platform during onboarding.
 *
 * All seed data is marked with identifiers for easy cleanup:
 * - Journal entries: Text contains "[DEMO]" or has "demo" tag
 * - Daily P&L: Note contains "[DEMO]"
 * - Positions: BrokerConnection has brokerSource = "DEMO"
 * - Monthly NAV: Note contains "[DEMO]"
 */

import { db as prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

interface SeedDataOptions {
  orgId: string;
  userId: string;
  includeSamplePositions?: boolean;
  includeSampleJournal?: boolean;
  includeSamplePnl?: boolean;
  includeSampleNav?: boolean;
}

export interface SeedDataResult {
  success: boolean;
  created: {
    journalEntries: number;
    dailyPnlEntries: number;
    positions: number;
    monthlyNavEntries: number;
    brokerConnections: number;
  };
  error?: string;
}

/**
 * Generates and inserts comprehensive seed data for a new user
 */
export async function generateSeedData(
  options: SeedDataOptions
): Promise<SeedDataResult> {
  const {
    orgId,
    userId,
    includeSamplePositions = true,
    includeSampleJournal = true,
    includeSamplePnl = true,
    includeSampleNav = true,
  } = options;

  try {
    const result = await prisma.$transaction(async (tx) => {
      let journalCount = 0;
      let dailyPnlCount = 0;
      let positionsCount = 0;
      let monthlyNavCount = 0;
      let connectionsCount = 0;

      // 1. Create demo broker connection and positions
      if (includeSamplePositions) {
        const demoConnection = await tx.brokerConnection.create({
          data: {
            orgId,
            userId,
            broker: "CSV_IMPORT",
            brokerSource: "DEMO",
            status: "ACTIVE",
            lastSyncedAt: new Date(),
          },
        });
        connectionsCount++;

        const demoAccount = await tx.brokerAccount.create({
          data: {
            connectionId: demoConnection.id,
            nickname: "Demo Portfolio",
            maskedNumber: "****1234",
            accountType: "MARGIN",
            lastSyncedAt: new Date(),
          },
        });

        // Create position snapshot with sample positions
        const positionSnapshot = await tx.positionSnapshot.create({
          data: {
            accountId: demoAccount.id,
            asOf: new Date(),
            cashTotal: new Prisma.Decimal(5000),
            marketValue: new Prisma.Decimal(52000),
            costBasisTotal: new Prisma.Decimal(50000),
            currency: "USD",
          },
        });

        // Sample positions
        const positions = await createSamplePositions(tx, positionSnapshot.id);
        positionsCount = positions.length;
      }

      // 2. Create sample journal entries
      if (includeSampleJournal) {
        const journals = await createSampleJournalEntries(tx, orgId, userId);
        journalCount = journals.length;
      }

      // 3. Create sample daily P&L entries
      if (includeSamplePnl) {
        const pnlEntries = await createSampleDailyPnl(tx, orgId);
        dailyPnlCount = pnlEntries.length;
      }

      // 4. Create sample monthly NAV
      if (includeSampleNav) {
        const navEntries = await createSampleMonthlyNav(tx, orgId);
        monthlyNavCount = navEntries.length;
      }

      return {
        journalEntries: journalCount,
        dailyPnlEntries: dailyPnlCount,
        positions: positionsCount,
        monthlyNavEntries: monthlyNavCount,
        brokerConnections: connectionsCount,
      };
    });

    return {
      success: true,
      created: result,
    };
  } catch (error) {
    console.error("Error generating seed data:", error);
    return {
      success: false,
      created: {
        journalEntries: 0,
        dailyPnlEntries: 0,
        positions: 0,
        monthlyNavEntries: 0,
        brokerConnections: 0,
      },
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Creates sample position lots for the demo portfolio
 */
async function createSamplePositions(
  tx: Prisma.TransactionClient,
  snapshotId: string
) {
  // Sample instruments and positions
  const sampleData = [
    { symbol: "SPY", name: "SPDR S&P 500 ETF", assetClass: "ETF", qty: 100, avgPrice: 450, currentPrice: 455 },
    { symbol: "AAPL", name: "Apple Inc.", assetClass: "EQUITY", qty: 50, avgPrice: 180, currentPrice: 185 },
    { symbol: "MSFT", name: "Microsoft Corp.", assetClass: "EQUITY", qty: 30, avgPrice: 370, currentPrice: 380 },
    { symbol: "TSLA", name: "Tesla Inc.", assetClass: "EQUITY", qty: 20, avgPrice: 240, currentPrice: 250 },
    { symbol: "NVDA", name: "NVIDIA Corp.", assetClass: "EQUITY", qty: 15, avgPrice: 500, currentPrice: 520 },
    { symbol: "QQQ", name: "Invesco QQQ Trust", assetClass: "ETF", qty: 50, avgPrice: 380, currentPrice: 385 },
    { symbol: "AMZN", name: "Amazon.com Inc.", assetClass: "EQUITY", qty: 25, avgPrice: 140, currentPrice: 145 },
    { symbol: "GOOGL", name: "Alphabet Inc.", assetClass: "EQUITY", qty: 20, avgPrice: 135, currentPrice: 140 },
  ];

  const positions = [];

  for (const data of sampleData) {
    // Create or find instrument
    const instrument = await tx.instrument.upsert({
      where: {
        symbol_exchange: {
          symbol: data.symbol,
          exchange: "NASDAQ",
        },
      },
      update: {},
      create: {
        symbol: data.symbol,
        name: data.name,
        assetClass: data.assetClass as any,
        exchange: "NASDAQ",
        currency: "USD",
      },
    });

    // Create position lot
    const costBasis = data.qty * data.avgPrice;
    const marketValue = data.qty * data.currentPrice;
    const unrealizedPL = marketValue - costBasis;

    const position = await tx.positionLot.create({
      data: {
        snapshotId,
        instrumentId: instrument.id,
        quantity: new Prisma.Decimal(data.qty),
        averagePrice: new Prisma.Decimal(data.avgPrice),
        costBasis: new Prisma.Decimal(costBasis),
        marketPrice: new Prisma.Decimal(data.currentPrice),
        marketValue: new Prisma.Decimal(marketValue),
        unrealizedPL: new Prisma.Decimal(unrealizedPL),
        unrealizedPLPct: new Prisma.Decimal((unrealizedPL / costBasis) * 100),
        basisMethod: "FIFO",
        basisAggregate: true,
      },
    });

    positions.push(position);
  }

  return positions;
}

/**
 * Creates sample journal entries
 */
async function createSampleJournalEntries(
  tx: Prisma.TransactionClient,
  orgId: string,
  userId: string
) {
  const today = new Date();
  const entries = [
    {
      daysAgo: 1,
      text: "[DEMO] Strong market open. Entered SPY calls at support level. Following the trend with tight stops.",
      tags: ["options", "SPY", "demo"],
      isWinner: true,
    },
    {
      daysAgo: 2,
      text: "[DEMO] Took profit on AAPL position. Hit my 5% target. Discipline paid off today.",
      tags: ["profit-taking", "AAPL", "demo"],
      isWinner: true,
    },
    {
      daysAgo: 3,
      text: "[DEMO] Stopped out of TSLA swing trade. Market reversed after Fed announcement. Kept loss small.",
      tags: ["stopped-out", "TSLA", "demo"],
      isWinner: false,
    },
    {
      daysAgo: 5,
      text: "[DEMO] Added to MSFT position on dip. Long-term hold, averaged down cost basis.",
      tags: ["averaging-down", "MSFT", "demo"],
      isWinner: null,
    },
    {
      daysAgo: 7,
      text: "[DEMO] Market consolidating. Sold covered calls on SPY position to generate income.",
      tags: ["options", "income", "SPY", "demo"],
      isWinner: null,
    },
    {
      daysAgo: 10,
      text: "[DEMO] Choppy market conditions. Staying mostly cash and waiting for clearer setups.",
      tags: ["patience", "cash", "demo"],
      isWinner: null,
    },
    {
      daysAgo: 12,
      text: "[DEMO] Great day! NVDA earnings beat expectations. My calls up 40%. Took half off the table.",
      tags: ["earnings", "NVDA", "options", "demo"],
      isWinner: true,
    },
    {
      daysAgo: 14,
      text: "[DEMO] Entered small position in QQQ at support. Using wider stops due to volatility.",
      tags: ["QQQ", "support", "demo"],
      isWinner: null,
    },
    {
      daysAgo: 17,
      text: "[DEMO] Reviewed weekly performance. Win rate 65%, but need to work on letting winners run longer.",
      tags: ["review", "self-improvement", "demo"],
      isWinner: null,
    },
    {
      daysAgo: 20,
      text: "[DEMO] Market gapped down at open. Stayed disciplined and didn't chase. Avoided FOMO.",
      tags: ["discipline", "FOMO", "demo"],
      isWinner: null,
    },
  ];

  const created = [];

  for (const entry of entries) {
    const date = new Date(today);
    date.setDate(date.getDate() - entry.daysAgo);

    const journalEntry = await tx.journalEntry.create({
      data: {
        orgId,
        userId,
        date,
        text: entry.text,
        tags: entry.tags,
        isWinner: entry.isWinner,
      },
    });

    created.push(journalEntry);
  }

  return created;
}

/**
 * Creates sample daily P&L entries
 */
async function createSampleDailyPnl(
  tx: Prisma.TransactionClient,
  orgId: string
) {
  const today = new Date();
  const entries = [];

  // Generate 30 days of P&L data with realistic fluctuations
  const dailyPnlData = [
    { realized: 450, unrealized: 1200, equity: 52000 },
    { realized: -150, unrealized: 1100, equity: 51850 },
    { realized: 320, unrealized: 1350, equity: 52170 },
    { realized: 0, unrealized: 1280, equity: 52170 },
    { realized: 0, unrealized: 1150, equity: 52170 },
    { realized: 680, unrealized: 1420, equity: 52850 },
    { realized: -200, unrealized: 1200, equity: 52650 },
    { realized: 520, unrealized: 1450, equity: 53170 },
    { realized: 0, unrealized: 1380, equity: 53170 },
    { realized: 0, unrealized: 1320, equity: 53170 },
    { realized: 850, unrealized: 1550, equity: 54020 },
    { realized: -120, unrealized: 1480, equity: 53900 },
    { realized: 0, unrealized: 1520, equity: 53900 },
    { realized: 0, unrealized: 1460, equity: 53900 },
    { realized: 420, unrealized: 1600, equity: 54320 },
    { realized: 380, unrealized: 1720, equity: 54700 },
    { realized: -250, unrealized: 1650, equity: 54450 },
    { realized: 0, unrealized: 1680, equity: 54450 },
    { realized: 0, unrealized: 1620, equity: 54450 },
    { realized: 560, unrealized: 1750, equity: 55010 },
    { realized: 0, unrealized: 1800, equity: 55010 },
    { realized: 720, unrealized: 1880, equity: 55730 },
    { realized: -180, unrealized: 1820, equity: 55550 },
    { realized: 0, unrealized: 1850, equity: 55550 },
    { realized: 0, unrealized: 1790, equity: 55550 },
    { realized: 490, unrealized: 1920, equity: 56040 },
    { realized: 340, unrealized: 1980, equity: 56380 },
    { realized: -90, unrealized: 1940, equity: 56290 },
    { realized: 0, unrealized: 1960, equity: 56290 },
    { realized: 0, unrealized: 1920, equity: 56290 },
  ];

  for (let i = dailyPnlData.length - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const data = dailyPnlData[dailyPnlData.length - 1 - i];

    const entry = await tx.dailyPnl.create({
      data: {
        orgId,
        date,
        realizedPnl: new Prisma.Decimal(data.realized),
        unrealizedPnl: new Prisma.Decimal(data.unrealized),
        totalEquity: new Prisma.Decimal(data.equity),
        note: "[DEMO] Sample trading data",
      },
    });

    entries.push(entry);
  }

  return entries;
}

/**
 * Creates sample monthly NAV entries
 */
async function createSampleMonthlyNav(
  tx: Prisma.TransactionClient,
  orgId: string
) {
  const entries = [];

  // Last 3 months of NAV data
  const monthlyData = [
    { monthsAgo: 2, nav: 50000 },
    { monthsAgo: 1, nav: 52000 },
    { monthsAgo: 0, nav: 56290 },
  ];

  for (const data of monthlyData) {
    const date = new Date();
    date.setMonth(date.getMonth() - data.monthsAgo);
    date.setDate(1); // First day of month
    date.setDate(0); // Last day of previous month (end of month)

    const entry = await tx.monthlyNavEom.create({
      data: {
        orgId,
        date,
        nav: new Prisma.Decimal(data.nav),
        note: "[DEMO] Sample NAV data",
      },
    });

    entries.push(entry);
  }

  return entries;
}

/**
 * Helper function to check if user has any seed data
 */
export async function hasSeedData(orgId: string): Promise<boolean> {
  const [journalCount, dailyPnlCount, positionCount, monthlyNavCount] =
    await Promise.all([
      prisma.journalEntry.count({
        where: {
          orgId,
          OR: [{ text: { contains: "[DEMO]" } }, { tags: { has: "demo" } }],
        },
      }),
      prisma.dailyPnl.count({
        where: { orgId, note: { contains: "[DEMO]" } },
      }),
      prisma.positionSnapshot.count({
        where: {
          account: {
            connection: { orgId, brokerSource: "DEMO" },
          },
        },
      }),
      prisma.monthlyNavEom.count({
        where: { orgId, note: { contains: "[DEMO]" } },
      }),
    ]);

  return journalCount + dailyPnlCount + positionCount + monthlyNavCount > 0;
}
