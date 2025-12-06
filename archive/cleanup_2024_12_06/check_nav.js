const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNavData() {
  try {
    console.log('Checking MonthlyNav_eom table for October and November 2024...\n');

    const navEntries = await prisma.monthlyNav_eom.findMany({
      where: {
        date: {
          gte: new Date('2024-09-01'),
          lt: new Date('2024-12-01')
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    console.log('Found entries:', navEntries.length);
    navEntries.forEach(entry => {
      console.log(`Date: ${entry.date.toISOString().slice(0, 10)}, NAV: ${entry.nav}, OrgId: ${entry.orgId}`);
    });

    // Also check the SQL query that's used in the calendar
    console.log('\n\nTesting LAG query for November 2024...\n');

    const start = new Date(2024, 10, 1); // November 1, 2024
    const prevMonthStart = new Date(2024, 9, 1); // October 1, 2024
    const nextMonthStart = new Date(2024, 11, 1); // December 1, 2024

    const rows = await prisma.$queryRaw`
      WITH nav_data AS (
        SELECT date_trunc('month', date)::date AS month,
               nav,
               LAG(nav) OVER (ORDER BY date) AS prev_nav
          FROM "MonthlyNav_eom"
         WHERE date >= ${prevMonthStart} AND date < ${nextMonthStart}
      )
      SELECT month::text, nav, prev_nav FROM nav_data ORDER BY month
    `;

    console.log('LAG Query Results:');
    console.log(rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNavData();
