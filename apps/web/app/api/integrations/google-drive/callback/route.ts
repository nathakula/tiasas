import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/integrations/google-drive";
import { encryptToken } from "@/lib/integrations/encryption";
import { db as prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/integrations/google-drive/callback
 * OAuth callback handler
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    const errorUrl = new URL("/market-desk/ai/settings/integrations/google-drive", req.url);
    errorUrl.searchParams.set("error", error);
    return NextResponse.redirect(errorUrl);
  }

  if (!code || !state) {
    const errorUrl = new URL("/market-desk/ai/settings/integrations/google-drive", req.url);
    errorUrl.searchParams.set("error", "missing_parameters");
    return NextResponse.redirect(errorUrl);
  }

  try {
    // Decode state
    const stateData = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
    const { orgId } = stateData;

    if (!orgId) {
      throw new Error("Invalid state parameter");
    }

    // Exchange code for tokens
    const { accessToken, refreshToken, expiryDate, scope } = await exchangeCodeForTokens(code);

    // Encrypt refresh token
    const encryptedRefreshToken = encryptToken(refreshToken);

    // Check if integration already exists
    const existing = await prisma.integrationGoogleDrive.findUnique({
      where: { orgId },
    });

    if (existing) {
      // Update existing integration
      await prisma.integrationGoogleDrive.update({
        where: { id: existing.id },
        data: {
          refreshTokenEncrypted: encryptedRefreshToken,
          accessToken,
          tokenExpiry: new Date(expiryDate),
          scope,
          enabled: true,
        },
      });

      // Log reconnection
      await logAudit({
        orgId,
        userId: stateData.userId || "system",
        action: "UPDATE",
        entity: "IntegrationGoogleDrive",
        entityId: existing.id,
        after: {
          reconnected: true,
          timestamp: new Date().toISOString(),
        },
      }).catch(console.error);
    } else {
      // Create new integration (folderId will be set later via POST)
      await prisma.integrationGoogleDrive.create({
        data: {
          orgId,
          refreshTokenEncrypted: encryptedRefreshToken,
          accessToken,
          tokenExpiry: new Date(expiryDate),
          scope,
          folderId: "", // Placeholder - admin will configure via settings
          enabled: true,
        },
      });

      // Log creation
      await logAudit({
        orgId,
        userId: stateData.userId || "system",
        action: "CREATE",
        entity: "IntegrationGoogleDrive",
        entityId: orgId,
        after: {
          connected: true,
          timestamp: new Date().toISOString(),
        },
      }).catch(console.error);
    }

    // Redirect to settings page with success
    const successUrl = new URL("/market-desk/ai/settings/integrations/google-drive", req.url);
    successUrl.searchParams.set("success", "connected");
    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error("Error in Google Drive callback:", error);
    const errorUrl = new URL("/market-desk/ai/settings/integrations/google-drive", req.url);
    errorUrl.searchParams.set("error", "callback_failed");
    return NextResponse.redirect(errorUrl);
  }
}
