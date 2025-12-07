const { PrismaClient } = require('./packages/database/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function checkMissingMonths() {
  try {
    // Compare what's in MonthlyNav_eom vs what got backfilled
    const navRecords = await prisma.monthlyNavEom.findMany({
      where: {
        date: {
          gte: new Date('2025-01-01'),
          lt: new Date('2025-12-01')
        }
      },
      orderBy: { date: 'asc' },
      select: { date: true, nav: true }
    });

    console.log('\n=== MonthlyNav_eom Records ===');
    navRecords.forEach(row => {
      console.log(`  ${row.date.toISOString().slice(0, 10)}: NAV = ${row.nav}`);
    });

    // Check what last trading day exists in DailyPnl for each month
    const monthsQuery = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', date)::date as month_start,
        MAX(date) as last_trading_day,
        COUNT(*) as trading_days
      FROM "DailyPnl"
      WHERE date >= '2025-01-01' AND date < '2025-12-01'
      GROUP BY DATE_TRUNC('month', date)::date
      ORDER BY month_start ASC
    `;

    console.log('\n=== Last Trading Days in DailyPnl ===');
    monthsQuery.forEach(row => {
      console.log(`  Month: ${row.month_start.toISOString().slice(0, 7)}, Last Trading Day: ${row.last_trading_day.toISOString().slice(0, 10)}, Trading Days: ${row.trading_days}`);
    });

    // Show which NAV records matched with DailyPnl
    console.log('\n=== Matching Analysis ===');
    for (const nav of navRecords) {
      const navDate = nav.date.toISOString().slice(0, 10);
      const dailyRecord = await prisma.dailyPnl.findFirst({
        where: { date: nav.date },
        select: { date: true, totalEquity: true }
      });

      if (dailyRecord) {
        console.log(`  ✓ ${navDate}: Found matching DailyPnl record, totalEquity = ${dailyRecord.totalEquity?.toString() || 'NULL'}`);
      } else {
        console.log(`  ✗ ${navDate}: NO matching DailyPnl record (NAV = ${nav.nav})`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMissingMonths();
