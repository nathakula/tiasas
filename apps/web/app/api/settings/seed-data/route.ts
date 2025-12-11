import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";

/**
 * GET /api/settings/seed-data
 * Returns statistics about seed data in the user's account
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user and org
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { memberships: { take: 1 } },
    });

    if (!user || !user.memberships[0]) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const orgId = user.memberships[0].orgId;

    // Count seed data records across different tables
    // Seed data is identified by metadata field containing { is_demo: true }

    const [journalEntries, dailyPnlEntries, positionSnapshots, monthlyNavEntries] =
      await Promise.all([
        // Journal entries with demo metadata
        prisma.journalEntry.count({
          where: {
            orgId,
            // Note: This assumes metadata is stored as Json type
            // Adjust the query based on your actual metadata structure
          },
        }),

        // Daily P&L entries (we'll need to add metadata field in migration)
        prisma.dailyPnl.count({
          where: {
            orgId,
            note: { contains: "[DEMO]" }, // Simple marker until metadata field added
          },
        }),

        // Position snapshots
        prisma.positionSnapshot.count({
          where: {
            account: {
              connection: {
                orgId,
                brokerSource: "DEMO", // Demo connections marked with DEMO source
              },
            },
          },
        }),

        // Monthly NAV entries
        prisma.monthlyNavEom.count({
          where: {
            orgId,
            note: { contains: "[DEMO]" },
          },
        }),
      ]);

    const totalRecords =
      journalEntries + dailyPnlEntries + positionSnapshots + monthlyNavEntries;

    return NextResponse.json({
      hasSeedData: totalRecords > 0,
      journalEntries,
      dailyPnlEntries,
      positions: positionSnapshots,
      monthlyNavEntries,
    });
  } catch (error) {
    console.error("Error fetching seed data stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/seed-data
 * Deletes all seed/demo data from the user's account
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user and org
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { memberships: { take: 1 } },
    });

    if (!user || !user.memberships[0]) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const orgId = user.memberships[0].orgId;

    // Delete seed data in a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete demo broker connections and cascading data
      const demoConnections = await tx.brokerConnection.findMany({
        where: {
          orgId,
          brokerSource: "DEMO",
        },
        select: { id: true },
      });

      const demoConnectionIds = demoConnections.map((c) => c.id);

      // Delete position snapshots for demo connections (cascade will handle position lots)
      let deletedPositions = 0;
      if (demoConnectionIds.length > 0) {
        const accountsResult = await tx.brokerAccount.findMany({
          where: { connectionId: { in: demoConnectionIds } },
          select: { id: true },
        });
        const accountIds = accountsResult.map((a) => a.id);

        if (accountIds.length > 0) {
          const positionsResult = await tx.positionSnapshot.deleteMany({
            where: { accountId: { in: accountIds } },
          });
          deletedPositions = positionsResult.count;

          // Delete broker accounts
          await tx.brokerAccount.deleteMany({
            where: { id: { in: accountIds } },
          });
        }

        // Delete demo connections
        await tx.brokerConnection.deleteMany({
          where: { id: { in: demoConnectionIds } },
        });
      }

      // 2. Delete journal entries marked as demo
      // For now, we'll delete based on a pattern in the text or tags
      // In the future migration, we can add metadata field
      const deletedJournals = await tx.journalEntry.deleteMany({
        where: {
          orgId,
          OR: [
            { text: { contains: "[DEMO]" } },
            { tags: { has: "demo" } },
          ],
        },
      });

      // 3. Delete daily P&L entries marked as demo
      const deletedDailyPnl = await tx.dailyPnl.deleteMany({
        where: {
          orgId,
          note: { contains: "[DEMO]" },
        },
      });

      // 4. Delete monthly NAV entries marked as demo
      const deletedMonthlyNav = await tx.monthlyNavEom.deleteMany({
        where: {
          orgId,
          note: { contains: "[DEMO]" },
        },
      });

      return {
        journalEntries: deletedJournals.count,
        dailyPnlEntries: deletedDailyPnl.count,
        positions: deletedPositions,
        monthlyNavEntries: deletedMonthlyNav.count,
      };
    });

    const totalDeleted =
      result.journalEntries +
      result.dailyPnlEntries +
      result.positions +
      result.monthlyNavEntries;

    // Log the deletion for audit purposes
    await prisma.auditLog.create({
      data: {
        orgId,
        userId: user.id,
        action: "DELETE",
        entity: "SeedData",
        entityId: "bulk_delete",
        before: null,
        after: result,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Demo data deleted successfully",
      deletedCount: totalDeleted,
      breakdown: result,
    });
  } catch (error) {
    console.error("Error deleting seed data:", error);
    return NextResponse.json(
      { error: "Failed to delete seed data" },
      { status: 500 }
    );
  }
}
