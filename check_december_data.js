const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDecemberData() {
  try {
    const data = await prisma.dailyPnl.findMany({
      where: {
        date: {
          gte: new Date('2025-12-01T00:00:00Z'),
          lt: new Date('2025-12-10T00:00:00Z')
        }
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        realizedPnl: true,
        unrealizedPnl: true,
        totalEquity: true,
        note: true
      }
    });

    console.log('\n=== DATABASE CONTENTS - December 1-9, 2025 ===\n');
    console.log('Date       | Realized | Unrealized | Total Equity | Note');
    console.log('-----------|----------|------------|--------------|-----');

    data.forEach(row => {
      const date = row.date.toISOString().slice(0, 10);
      const realized = row.realizedPnl.toString().padStart(8);
      const unrealized = row.unrealizedPnl.toString().padStart(10);
      const equity = row.totalEquity ? row.totalEquity.toString().padStart(12) : 'NULL'.padStart(12);
      const note = (row.note || '').slice(0, 30);
      console.log(`${date} | ${realized} | ${unrealized} | ${equity} | ${note}`);
    });

    console.log('\n=== RAW JSON ===\n');
    data.forEach(row => {
      console.log(JSON.stringify({
        date: row.date.toISOString(),
        realizedPnl: row.realizedPnl.toString(),
        unrealizedPnl: row.unrealizedPnl.toString(),
        totalEquity: row.totalEquity?.toString() || null,
        note: row.note
      }, null, 2));
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDecemberData();
