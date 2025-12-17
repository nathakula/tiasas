import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/route-helpers";
import { db as prisma } from "@/lib/db";
import { encryptToken } from "@/lib/integrations/encryption";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const configSchema = z.object({
  folderId: z.string().min(1, "Folder ID is required"),
  fileAgeFilterDays: z.number().int().min(0).max(365).default(30),
});

/**
 * POST /api/integrations/google-drive
 * Save Google Drive configuration (folder ID, settings)
 * Admin-only - This is called AFTER OAuth to set folder ID
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const orgId = auth.orgId;
  if (!("user" in auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  try {
    const body = await req.json();
    const parsed = configSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { folderId, fileAgeFilterDays } = parsed.data;

    // Check if integration exists
    const existing = await prisma.integrationGoogleDrive.findUnique({
      where: { orgId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "OAuth not completed. Please connect first." },
        { status: 400 }
      );
    }

    // Update configuration
    const updated = await prisma.integrationGoogleDrive.update({
      where: { id: existing.id },
      data: {
        folderId,
        fileAgeFilterDays,
      },
    });

    // Log configuration update
    await logAudit({
      orgId,
      userId: user.id,
      action: "UPDATE",
      entity: "IntegrationGoogleDrive",
      entityId: updated.id,
      before: {
        folderId: existing.folderId,
        fileAgeFilterDays: existing.fileAgeFilterDays,
      },
      after: {
        folderId,
        fileAgeFilterDays,
      },
    }).catch(console.error);

    return NextResponse.json({ success: true, integration: updated });
  } catch (error) {
    console.error("Error saving Drive configuration:", error);
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/google-drive
 * Disconnect Google Drive integration
 * Admin-only
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const orgId = auth.orgId;
  if (!("user" in auth)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  try {
    const integration = await prisma.integrationGoogleDrive.findUnique({
      where: { orgId },
    });

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Delete integration and cascade to file cache
    await prisma.integrationGoogleDrive.delete({
      where: { id: integration.id },
    });

    // Log disconnection
    await logAudit({
      orgId,
      userId: user.id,
      action: "DELETE",
      entity: "IntegrationGoogleDrive",
      entityId: integration.id,
      before: {
        folderId: integration.folderId,
        enabled: integration.enabled,
      },
      after: null,
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting Drive:", error);
    return NextResponse.json(
      { error: "Failed to disconnect integration" },
      { status: 500 }
    );
  }
}
