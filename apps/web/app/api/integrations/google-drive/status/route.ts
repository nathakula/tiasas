import { NextRequest, NextResponse } from "next/server";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import { db as prisma } from "@/lib/db";

/**
 * GET /api/integrations/google-drive/status
 * Get Google Drive integration status for current org
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;

  const { orgId } = auth;

  try {
    const integration = await prisma.integrationGoogleDrive.findUnique({
      where: { orgId },
      select: {
        id: true,
        enabled: true,
        folderId: true,
        fileAgeFilterDays: true,
        tokenExpiry: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!integration) {
      return NextResponse.json({
        connected: false,
        integration: null,
      });
    }

    // Check if token is expired
    const isTokenExpired = integration.tokenExpiry ? new Date() > integration.tokenExpiry : false;

    return NextResponse.json({
      connected: true,
      integration: {
        ...integration,
        isTokenExpired,
      },
    });
  } catch (error) {
    console.error("Error fetching Drive integration status:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
