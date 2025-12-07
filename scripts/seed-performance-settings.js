
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding Yearly Performance Settings...");

    // Get the first org
    const org = await prisma.org.findFirst();
    if (!org) {
        console.error("No organization found.");
        return;
    }

    const year = new Date().getFullYear();
    const STARTING_CAPITAL = 100000; // Default 100k

    console.log(`Setting starting capital for Org ${org.id} Year ${year} to $${STARTING_CAPITAL}`);

    const settings = await prisma.yearlyPerformanceSettings.upsert({
        where: {
            orgId_year: {
                orgId: org.id,
                year: year
            }
        },
        create: {
            orgId: org.id,
            year: year,
            startingCapital: STARTING_CAPITAL,
            benchmarks: ["SPY", "QQQ"]
        },
        update: {
            startingCapital: STARTING_CAPITAL
        }
    });

    console.log("Settings updated:", JSON.stringify(settings, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
