const { PrismaClient } = require('./packages/database/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function showBackfilledData() {
  try {
    // Show all records with totalEquity from 2025, ordered by date
    const records = await prisma.dailyPnl.findMany({
      where: {
        date: {
          gte: new Date('2025-01-01T00:00:00Z'),
          lt: new Date('2025-12-01T00:00:00Z')
        },
        totalEquity: { not: null }
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        totalEquity: true,
        realizedPnl: true,
        unrealizedPnl: true
      }
    });

    console.log('\n=== All 2025 Records with Total Equity (Jan-Nov) ===\n');
    console.log('Date       | Total Equity | Realized | Unrealized');
    console.log('-----------|--------------|----------|------------');

    records.forEach(row => {
      const date = row.date.toISOString().slice(0, 10);
      const equity = row.totalEquity.toString().padStart(12);
      const realized = row.realizedPnl.toString().padStart(8);
      const unrealized = row.unrealizedPnl.toString().padStart(10);
      console.log(`${date} | ${equity} | ${realized} | ${unrealized}`);
    });

    console.log(`\nTotal records with Total Equity: ${records.length}`);

    // Also show December for comparison
    const decRecords = await prisma.dailyPnl.findMany({
      where: {
        date: {
          gte: new Date('2025-12-01T00:00:00Z'),
          lt: new Date('2025-12-10T00:00:00Z')
        }
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        totalEquity: true,
        realizedPnl: true,
        unrealizedPnl: true
      }
    });

    console.log('\n=== December 2025 Records (manually entered) ===\n');
    console.log('Date       | Total Equity | Realized | Unrealized');
    console.log('-----------|--------------|----------|------------');

    decRecords.forEach(row => {
      const date = row.date.toISOString().slice(0, 10);
      const equity = row.totalEquity ? row.totalEquity.toString().padStart(12) : 'NULL'.padStart(12);
      const realized = row.realizedPnl.toString().padStart(8);
      const unrealized = row.unrealizedPnl.toString().padStart(10);
      console.log(`${date} | ${equity} | ${realized} | ${unrealized}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showBackfilledData();
