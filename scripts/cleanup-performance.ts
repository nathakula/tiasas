
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Cleaning up seeded performance data...");

    // Delete only entries marked as "Seeded by AI"
    const { count } = await prisma.dailyPnl.deleteMany({
        where: {
            note: "Seeded by AI"
        }
    });

    console.log(`Successfully deleted ${count} seeded DailyPnl entries.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
