
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting verification of Total Equity persistence...");

    // Get the first org
    const org = await prisma.org.findFirst();
    if (!org) {
        console.error("No organization found.");
        return;
    }

    const orgId = org.id;
    const testDate = new Date();
    testDate.setUTCHours(0, 0, 0, 0); // Normalize to midnight UTC for consistency if needed, though Schema uses DateTime

    const TEST_EQUITY_VALUE = 12345.67;

    console.log(`Upserting test entry for org ${orgId} on date ${testDate.toISOString()} with Total Equity: ${TEST_EQUITY_VALUE}`);

    // Upsert
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
            note: "Verification Script Test"
        },
        update: {
            totalEquity: TEST_EQUITY_VALUE,
            note: "Verification Script Test - Updated"
        }
    });

    console.log("Upsert complete. Result from Prisma:", JSON.stringify(upserted, null, 2));

    // Read back to be absolutely sure
    const readBack = await prisma.dailyPnl.findUnique({
        where: {
            orgId_date: {
                orgId,
                date: testDate
            }
        }
    });

    console.log("Read back entry:", JSON.stringify(readBack, null, 2));

    if (readBack?.totalEquity && Number(readBack.totalEquity) === TEST_EQUITY_VALUE) {
        console.log("SUCCESS: Total Equity persisted correctly.");
    } else {
        console.error("FAILURE: Total Equity did NOT match expected value.");
        console.error(`Expected: ${TEST_EQUITY_VALUE}`);
        console.error(`Got: ${readBack?.totalEquity}`);
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
