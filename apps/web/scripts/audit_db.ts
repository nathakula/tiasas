
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const email = "srinath.akula@gmail.com"; // Assuming this is the user based on "Srinath's Workspace"
    // Or fetch all users and their memberships
    const users = await prisma.user.findMany({
        where: { email: { contains: "srinath" } }, // Flexible match
        include: { memberships: { include: { org: true } } }
    });

    for (const user of users) {
        console.log(`User: ${user.email} (${user.id})`);
        for (const m of user.memberships) {
            console.log(`  Org: ${m.org.name} (${m.orgId}) - Role: ${m.role}`);

            const journalCount = await prisma.journalEntry.count({ where: { orgId: m.orgId } });
            const pnlCount = await prisma.dailyPnl.count({ where: { orgId: m.orgId } });
            const demoJournal = await prisma.journalEntry.count({ where: { orgId: m.orgId, text: { contains: "DEMO" } } });
            const demoPnl = await prisma.dailyPnl.count({ where: { orgId: m.orgId, note: { contains: "DEMO" } } });

            console.log(`    Journal Entries: ${journalCount} (Demo: ${demoJournal})`);
            console.log(`    Daily PnL: ${pnlCount} (Demo: ${demoPnl})`);
        }
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
