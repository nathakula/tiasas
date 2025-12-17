import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/route-helpers";
import { getAuthorizationUrl } from "@/lib/integrations/google-drive";

/**
 * POST /api/integrations/google-drive/connect
 * Initiate Google Drive OAuth flow
 * Admin-only
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { orgId } = auth;

  try {
    // Generate state parameter with orgId
    const state = Buffer.from(JSON.stringify({ orgId, timestamp: Date.now() })).toString("base64");

    // Get authorization URL
    const authUrl = getAuthorizationUrl(state);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Error initiating Google Drive OAuth:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
}
