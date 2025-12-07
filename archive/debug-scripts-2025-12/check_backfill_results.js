const { PrismaClient } = require('./packages/database/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function checkBackfillResults() {
  try {
    // 1. Count MonthlyNav_eom records
    const navCount = await prisma.monthlyNavEom.count();
    console.log('\n=== MonthlyNav_eom Records ===');
    console.log(`Total count: ${navCount}`);

    // 2. Show sample MonthlyNav_eom data
    const navSample = await prisma.monthlyNavEom.findMany({
      take: 5,
      orderBy: { date: 'desc' },
      select: { date: true, nav: true, orgId: true }
    });
    console.log('\nSample data:');
    navSample.forEach(row => {
      console.log(`  Date: ${row.date.toISOString().slice(0, 10)}, NAV: ${row.nav.toString()}, OrgId: ${row.orgId}`);
    });

    // 3. Count DailyPnl with totalEquity NOT NULL
    const pnlWithEquity = await prisma.dailyPnl.count({
      where: { totalEquity: { not: null } }
    });
    console.log(`\n=== DailyPnl with totalEquity ===`);
    console.log(`Count: ${pnlWithEquity}`);

    // 4. Check for December records
    const decemberRecords = await prisma.dailyPnl.findMany({
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
        orgId: true
      }
    });
    console.log('\n=== December DailyPnl Records ===');
    decemberRecords.forEach(row => {
      console.log(`  Date: ${row.date.toISOString().slice(0, 10)}, Total Equity: ${row.totalEquity?.toString() || 'NULL'}, OrgId: ${row.orgId}`);
    });

    // 5. Check what months we have in DailyPnl vs MonthlyNav_eom
    const monthsQuery = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', dp.date)::date as month,
        MAX(dp.date) as last_trading_day,
        COUNT(DISTINCT mn.date) as has_nav_data,
        MAX(mn.nav) as nav_value,
        dp."orgId"
      FROM "DailyPnl" dp
      LEFT JOIN "MonthlyNav_eom" mn
        ON dp."orgId" = mn."orgId"
        AND DATE_TRUNC('month', dp.date)::date = mn.date
      WHERE dp.date >= '2025-01-01'
      GROUP BY DATE_TRUNC('month', dp.date)::date, dp."orgId"
      ORDER BY month DESC
      LIMIT 12
    `;
    console.log('\n=== Month Matching Analysis ===');
    monthsQuery.forEach(row => {
      console.log(`  Month: ${row.month.toISOString().slice(0, 10)}, Last Day: ${row.last_trading_day.toISOString().slice(0, 10)}, Has NAV: ${row.has_nav_data}, NAV: ${row.nav_value || 'NULL'}, OrgId: ${row.orgId}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBackfillResults();
