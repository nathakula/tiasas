
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { calculatePortfolioRatios } from "@tiasas/core/src/services/performance";
import { db } from "@tiasas/database";

// Force dynamic to ensure we get fresh data
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get the User's Org (Assuming single org for now or current context)
        // For now, we'll grab the first membership found or use a passed 'orgId' query param
        // If your app has an 'active org' context in the URL or header, use that.
        // Fallback: Get user's first org.
        const { searchParams } = new URL(req.url);
        let orgId = searchParams.get("orgId");

        if (!orgId) {
            const membership = await db.membership.findFirst({
                where: { userId: (session.user as any).id },
                select: { orgId: true }
            });
            orgId = membership?.orgId || null;
        }

        if (!orgId) {
            return new NextResponse("No Organization Found", { status: 400 });
        }

        // Parse query params
        const lookbackParam = searchParams.get("lookback");
        const startParam = searchParams.get("start");
        const endParam = searchParams.get("end");

        let options: any = {};
        if (startParam && endParam) {
            options.startDate = new Date(startParam);
            options.endDate = new Date(endParam);
        } else {
            options.lookbackDays = lookbackParam ? parseInt(lookbackParam) : 365;
        }

        const metrics = await calculatePortfolioRatios(orgId, options);

        return NextResponse.json(metrics);
    } catch (error) {
        console.error("[PERFORMANCE_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
