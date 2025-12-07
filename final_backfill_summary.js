const { PrismaClient } = require('./packages/database/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function finalSummary() {
  try {
    // Get all 2025 records with Total Equity
    const records = await prisma.dailyPnl.findMany({
      where: {
        date: {
          gte: new Date('2025-01-01T00:00:00Z')
        },
        totalEquity: { not: null }
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        totalEquity: true
      }
    });

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║      TOTAL EQUITY BACKFILL - COMPLETE SUMMARY             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('Total records with Total Equity: ' + records.length);
    console.log('\n--- Monthly End-of-Month Total Equity Values ---\n');

    // Group by month
    const byMonth = {};
    records.forEach(r => {
      const month = r.date.toISOString().slice(0, 7);
      if (!byMonth[month]) {
        byMonth[month] = [];
      }
      byMonth[month].push(r);
    });

    Object.keys(byMonth).sort().forEach(month => {
      const monthRecords = byMonth[month];
      const lastRecord = monthRecords[monthRecords.length - 1];
      const monthName = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      console.log(`  ${monthName.padEnd(20)} | ${lastRecord.date.toISOString().slice(0, 10)} | $${lastRecord.totalEquity.toString().padStart(10)}`);
    });

    console.log('\n--- Status by Month (Jan-Dec 2025) ---\n');

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    for (let i = 0; i < 12; i++) {
      const monthKey = `2025-${String(i + 1).padStart(2, '0')}`;
      const hasData = byMonth[monthKey] && byMonth[monthKey].length > 0;
      const status = hasData ? '✓ Backfilled' : (i === 11 ? '⚠ In Progress (partial)' : '✗ No data');
      const count = hasData ? byMonth[monthKey].length : 0;

      console.log(`  ${months[i].padEnd(12)} | ${status.padEnd(25)} | ${count} record(s)`);
    }

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  Next Steps:                                              ║');
    console.log('║  1. Refresh Prisma Studio to see backfilled values        ║');
    console.log('║  2. Navigate to Calendar page and check November          ║');
    console.log('║  3. Verify all historical months now show Total Equity    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

finalSummary();
