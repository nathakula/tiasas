
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log("Starting verification of Total Equity persistence (JS)...");

    // Get the first org
    const org = await prisma.org.findFirst();
    if (!org) {
        console.error("No organization found.");
        return;
    }

    const orgId = org.id;
    const testDate = new Date();
    testDate.setUTCHours(0, 0, 0, 0);

    const TEST_EQUITY_VALUE = 54321.99;

    console.log(`Upserting test entry for org ${orgId} on date ${testDate.toISOString()} with Total Equity: ${TEST_EQUITY_VALUE}`);

    const upserted = await prisma.dailyPnl.upsert({
        where: {
            orgId_date: {
                orgId,
                date: testDate
            }
        },
        create: {
            orgId,
            date: testDate,
            realizedPnl: 100,
            unrealizedPnl: 0,
            totalEquity: TEST_EQUITY_VALUE,
            note: "Verification Script Test (JS)"
        },
        update: {
            totalEquity: TEST_EQUITY_VALUE,
            note: "Verification Script Test (JS) - Updated"
        }
    });

    console.log("Upsert complete. Result:", JSON.stringify(upserted, null, 2));

    const readBack = await prisma.dailyPnl.findUnique({
        where: {
            orgId_date: {
                orgId,
                date: testDate
            }
        }
    });

    console.log("Read back entry:", JSON.stringify(readBack, null, 2));

    if (readBack && Number(readBack.totalEquity) === TEST_EQUITY_VALUE) {
        console.log("SUCCESS: Total Equity persisted correctly.");
    } else {
        console.error("FAILURE: Total Equity did NOT match expected value.");
        console.error(`Expected: ${TEST_EQUITY_VALUE}`);
        console.error(`Got: ${readBack ? readBack.totalEquity : 'null'}`);
        process.exit(1);
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
