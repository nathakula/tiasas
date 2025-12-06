const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Get the latest unrealized entries
  const entries = await prisma.dailyPnl.findMany({
    orderBy: { date: 'desc' },
    take: 5,
    select: {
      date: true,
      unrealizedPnl: true,
      realizedPnl: true,
    }
  });

  console.log('Latest Daily P&L Entries:');
  console.log('=========================');
  entries.forEach((entry) => {
    console.log(`Date: ${entry.date}`);
    console.log(`  Unrealized: $${entry.unrealizedPnl}`);
    console.log(`  Realized: $${entry.realizedPnl}`);
    console.log('---');
  });

  // Find the entry with -53400 unrealized
  const targetEntry = await prisma.dailyPnl.findFirst({
    where: {
      unrealizedPnl: -53400
    },
    select: {
      date: true,
      unrealizedPnl: true,
    }
  });

  console.log('\nEntry with -$53,400 unrealized:');
  console.log('================================');
  if (targetEntry) {
    console.log(`Date: ${targetEntry.date}`);
    console.log(`Date type: ${typeof targetEntry.date}`);
    console.log(`Date ISO: ${targetEntry.date.toISOString()}`);
    console.log(`Date UTC: ${targetEntry.date.toUTCString()}`);
    console.log(`Date Local: ${targetEntry.date.toLocaleString()}`);
  } else {
    console.log('Not found');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
