
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Get the first org (or a specific one if known, but for dev usually there's one)
    const org = await prisma.org.findFirst();

    if (!org) {
        console.error("No organization found to seed data for.");
        return;
    }

    const orgId = org.id;
    const today = new Date();

    // Clean up existing data for the last 5 days to avoid unique constraint errors
    // We will delete based on date range
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(today.getDate() - 6);

    console.log(`Clearing DailyPnl from ${fiveDaysAgo.toISOString()}...`);
    await prisma.dailyPnl.deleteMany({
        where: {
            orgId,
            date: {
                gte: fiveDaysAgo
            }
        }
    });

    console.log("Seeding 5 days of performance data...");

    // Generate 5 days of data
    // Scenario: Starting 100k equity, making some profits and losses
    let equity = 100000;

    const days = 5;
    for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);

        // Random PnL between -500 and +1500
        const realized = Math.floor(Math.random() * 2000) - 500;
        const unrealized = Math.floor(Math.random() * 1000) - 200;

        equity += realized; // Update equity

        await prisma.dailyPnl.create({
            data: {
                orgId,
                date: date,
                realizedPnl: realized,
                unrealizedPnl: unrealized,
                totalEquity: equity, // CRITICAL: This field is needed for Sharpe/Sortino
                note: "Seeded by AI"
            }
        });

        console.log(`Created entry for ${date.toISOString().split('T')[0]}: PnL=${realized}, Equity=${equity}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
