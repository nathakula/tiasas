
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        // Fetch all bulk imports (summary only first to be fast?)
        // Actually fetch everything, json parsing is fine for script
        const imports = await prisma.bulkImport.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        console.log(`Scanning ${imports.length} import logs...`);

        const foundRecords: any[] = [];

        for (const imp of imports) {
            const rows = imp.after as any[];
            if (!Array.isArray(rows)) continue;

            for (const row of rows) {
                if (!row.date) continue;
                const d = new Date(row.date);
                // Check for Dec 2025 (Month 11)
                if (d.getFullYear() === 2025 && d.getMonth() === 11 && d.getDate() <= 7) {
                    foundRecords.push({
                        sourceInit: imp.createdAt,
                        ...row
                    });
                }
            }
        }

        console.log(`Found ${foundRecords.length} records for Dec 1-7, 2025.`);
        if (foundRecords.length > 0) {
            console.log(JSON.stringify(foundRecords, null, 2));
        }
    } catch (e) {
        console.error("Error:", e);
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
