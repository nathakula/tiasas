
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
    year: z.number().int().min(2000).max(2100),
    startingCapital: z.number().min(0),
    benchmarks: z.array(z.string()).optional(),
});

/**
 * GET /api/settings/performance?year=2025
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

        // Find org via membership
        const membership = await prisma.membership.findFirst({
            where: { user: { email: session.user.email } },
            select: { orgId: true },
        });

        if (!membership) {
            return NextResponse.json({ error: "No organization found" }, { status: 404 });
        }

        const manualSettings = await prisma.yearlyPerformanceSettings.findUnique({
            where: {
                orgId_year: {
                    orgId: membership.orgId,
                    year,
                },
            },
        });

        // Default to 0 if not found, as preferred by user
        if (!manualSettings) {
            return NextResponse.json({
                year,
                startingCapital: 0,
                benchmarks: ["SPY", "QQQ"],
                isDefault: true,
            });
        }

        return NextResponse.json({
            ...manualSettings,
            startingCapital: Number(manualSettings.startingCapital),
            isDefault: false,
        });
    } catch (error) {
        console.error("[Performance Settings API] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * POST /api/settings/performance
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const result = updateSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: "Invalid input", details: result.error }, { status: 400 });
        }

        const { year, startingCapital, benchmarks } = result.data;

        const membership = await prisma.membership.findFirst({
            where: { user: { email: session.user.email } },
            select: { orgId: true },
        });

        if (!membership) {
            return NextResponse.json({ error: "No organization found" }, { status: 404 });
        }

        const updated = await prisma.yearlyPerformanceSettings.upsert({
            where: {
                orgId_year: {
                    orgId: membership.orgId,
                    year,
                },
            },
            create: {
                orgId: membership.orgId,
                year,
                startingCapital,
                benchmarks: benchmarks || ["SPY", "QQQ"],
            },
            update: {
                startingCapital,
                benchmarks: benchmarks || undefined,
            },
        });

        return NextResponse.json({
            ...updated,
            startingCapital: Number(updated.startingCapital),
        });
    } catch (error) {
        console.error("[Performance Settings API] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
