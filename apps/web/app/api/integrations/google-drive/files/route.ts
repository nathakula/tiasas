import { NextRequest, NextResponse } from "next/server";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import { listDriveFiles } from "@/lib/integrations/google-drive";
import { db as prisma } from "@/lib/db";

/**
 * GET /api/integrations/google-drive/files
 * List files from Google Drive folder
 * Query params: query, type (mimeType filter), pageToken
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;

  const { orgId } = auth;

  try {
    // Check if integration exists
    const integration = await prisma.integrationGoogleDrive.findUnique({
      where: { orgId },
    });

    if (!integration || !integration.enabled) {
      return NextResponse.json(
        { error: "Google Drive integration not configured" },
        { status: 400 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("query") || undefined;
    const typeFilter = searchParams.get("type") || undefined;
    const pageToken = searchParams.get("pageToken") || undefined;

    // Map type filter to MIME types
    const mimeTypeMap: Record<string, string> = {
      docs: "application/vnd.google-apps.document",
      sheets: "application/vnd.google-apps.spreadsheet",
      slides: "application/vnd.google-apps.presentation",
      pdf: "application/pdf",
      csv: "text/csv",
      images: "image/", // Prefix match
    };

    const mimeType = typeFilter ? mimeTypeMap[typeFilter] : undefined;

    // List files from Drive
    const result = await listDriveFiles(orgId, {
      query,
      mimeType,
      pageToken,
      pageSize: 50,
    });

    // Update file cache
    if (result.files.length > 0) {
      await Promise.all(
        result.files.map(async (file) => {
          if (!file.id) return;

          await prisma.googleDriveFileCache.upsert({
            where: {
              integrationId_driveFileId: {
                integrationId: integration.id,
                driveFileId: file.id,
              },
            },
            create: {
              integrationId: integration.id,
              driveFileId: file.id,
              name: file.name || "Untitled",
              mimeType: file.mimeType || "application/octet-stream",
              modifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
              size: file.size ? BigInt(file.size) : null,
              webViewLink: file.webViewLink || null,
              iconLink: file.iconLink || null,
              thumbnailLink: file.thumbnailLink || null,
            },
            update: {
              name: file.name || "Untitled",
              mimeType: file.mimeType || "application/octet-stream",
              modifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
              size: file.size ? BigInt(file.size) : null,
              webViewLink: file.webViewLink || null,
              iconLink: file.iconLink || null,
              thumbnailLink: file.thumbnailLink || null,
              lastSyncedAt: new Date(),
            },
          });
        })
      ).catch((error) => {
        console.error("Error updating file cache:", error);
        // Don't fail the request if cache update fails
      });
    }

    return NextResponse.json({
      files: result.files,
      nextPageToken: result.nextPageToken,
    });
  } catch (error) {
    console.error("Error listing Drive files:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list files" },
      { status: 500 }
    );
  }
}
