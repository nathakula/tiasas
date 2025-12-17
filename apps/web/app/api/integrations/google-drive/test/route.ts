import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/route-helpers";
import { testConnection } from "@/lib/integrations/google-drive";

/**
 * POST /api/integrations/google-drive/test
 * Test Google Drive connection
 * Admin-only
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { orgId } = auth;

  try {
    const result = await testConnection(orgId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error testing Drive connection:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Connection test failed",
      },
      { status: 500 }
    );
  }
}
