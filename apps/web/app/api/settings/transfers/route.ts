
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const transferSchema = z.object({
    date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)), // ISO or YYYY-MM-DD
    amount: z.number().positive(),
    type: z.enum(["DEPOSIT", "WITHDRAWAL"]),
    note: z.string().optional(),
});

/**
 * GET /api/settings/transfers?year=2025
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
        const startDate = new Date(`${year}-01-01`);
        const endDate = new Date(`${year + 1}-01-01`);

        const membership = await prisma.membership.findFirst({
            where: { user: { email: session.user.email } },
            select: { orgId: true },
        });

        if (!membership) {
            return NextResponse.json({ error: "No organization found" }, { status: 404 });
        }

        const transfers = await prisma.capitalTransfer.findMany({
            where: {
                orgId: membership.orgId,
                date: {
                    gte: startDate,
                    lt: endDate,
                },
            },
            orderBy: { date: "asc" },
        });

        return NextResponse.json(transfers);
    } catch (error) {
        console.error("[Transfers API] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * POST /api/settings/transfers
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        // Handle DELETE via POST for simplicity if ID provded, or separate method. 
        // Let's stick to standard REST: DELETE methods for deleting. 
        // This POST is for creating.

        const result = transferSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: "Invalid input", details: result.error }, { status: 400 });
        }

        const { date, amount, type, note } = result.data;

        const membership = await prisma.membership.findFirst({
            where: { user: { email: session.user.email } },
            select: { orgId: true },
        });

        if (!membership) {
            return NextResponse.json({ error: "No organization found" }, { status: 404 });
        }

        console.log("[Transfers API] Creating transfer:", { date, amount, type });

        const transfer = await prisma.capitalTransfer.create({
            data: {
                orgId: membership.orgId,
                date: new Date(date),
                amount,
                type: type as "DEPOSIT" | "WITHDRAWAL",
                note,
            },
        });

        return NextResponse.json(transfer);
    } catch (error) {
        console.error("[Transfers API] Create Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        // Verify ownership via Org
        const membership = await prisma.membership.findFirst({
            where: { user: { email: session.user.email } },
            select: { orgId: true },
        });

        if (!membership) return NextResponse.json({ error: "No Org" }, { status: 404 });

        // Ensure transfer belongs to org
        const transfer = await prisma.capitalTransfer.findFirst({
            where: { id, orgId: membership.orgId }
        });

        if (!transfer) return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });

        await prisma.capitalTransfer.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Transfers API] Delete Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
