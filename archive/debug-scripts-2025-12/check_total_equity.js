const { PrismaClient } = require('@prisma/client');

async function checkTotalEquity() {
  const prisma = new PrismaClient();

  try {
    // Check all DailyPnl records with their totalEquity values
    console.log('\n=== Checking DailyPnl records ===\n');

    const allRecords = await prisma.dailyPnl.findMany({
      orderBy: { date: 'desc' },
      take: 10,
      select: {
        id: true,
        date: true,
        realizedPnl: true,
        unrealizedPnl: true,
        totalEquity: true,
        note: true
      }
    });

    console.log(`Found ${allRecords.length} records:`);
    allRecords.forEach(record => {
      console.log('\n---');
      console.log(`Date: ${record.date.toISOString().slice(0, 10)}`);
      console.log(`Realized P&L: ${record.realizedPnl}`);
      console.log(`Unrealized P&L: ${record.unrealizedPnl}`);
      console.log(`Total Equity: ${record.totalEquity}`);
      console.log(`Note: ${record.note || 'N/A'}`);
    });

    // Check specifically for December 5th, 2025
    console.log('\n\n=== Checking December 5th, 2025 specifically ===\n');
    const dec5 = await prisma.dailyPnl.findMany({
      where: {
        date: {
          gte: new Date('2025-12-05T00:00:00Z'),
          lt: new Date('2025-12-06T00:00:00Z')
        }
      }
    });

    console.log(`Found ${dec5.length} record(s) for Dec 5:`);
    dec5.forEach(record => {
      console.log(JSON.stringify(record, null, 2));
    });

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTotalEquity();
