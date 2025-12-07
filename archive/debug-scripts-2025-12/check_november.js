const { PrismaClient } = require('./packages/database/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function checkNovember() {
  try {
    const novRecords = await prisma.dailyPnl.findMany({
      where: {
        date: {
          gte: new Date('2025-11-01T00:00:00Z'),
          lt: new Date('2025-12-01T00:00:00Z')
        }
      },
      orderBy: { date: 'desc' },
      select: {
        date: true,
        totalEquity: true,
        realizedPnl: true,
        unrealizedPnl: true
      }
    });

    console.log('\n=== All November 2025 DailyPnl Records ===\n');
    console.log('Date       | Total Equity | Realized | Unrealized');
    console.log('-----------|--------------|----------|------------');

    novRecords.forEach(row => {
      const date = row.date.toISOString().slice(0, 10);
      const equity = row.totalEquity ? row.totalEquity.toString().padStart(12) : 'NULL'.padStart(12);
      const realized = row.realizedPnl.toString().padStart(8);
      const unrealized = row.unrealizedPnl.toString().padStart(10);
      console.log(`${date} | ${equity} | ${realized} | ${unrealized}`);
    });

    console.log(`\nTotal November records: ${novRecords.length}`);
    console.log(`Records with Total Equity: ${novRecords.filter(r => r.totalEquity !== null).length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNovember();
