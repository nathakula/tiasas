import { NextRequest, NextResponse } from "next/server";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import { getFileMetadata, downloadFile, exportAsPdf } from "@/lib/integrations/google-drive";

/**
 * GET /api/integrations/google-drive/file/[id]/download
 * Download file
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuthOrgMembership();
  if ("error" in auth) return auth.error;

  const { orgId } = auth;
  const fileId = params.id;

  try {
    // Get file metadata
    const metadata = await getFileMetadata(orgId, fileId);
    const mimeType = metadata.mimeType || "";
    const fileName = metadata.name || "download";

    let fileBuffer: Buffer;
    let downloadMimeType: string;
    let downloadFileName: string;

    // Handle Google Workspace files (need export)
    if (mimeType.startsWith("application/vnd.google-apps.")) {
      // Export as PDF
      fileBuffer = await exportAsPdf(orgId, fileId);
      downloadMimeType = "application/pdf";
      downloadFileName = `${fileName}.pdf`;
    } else {
      // Download directly
      fileBuffer = await downloadFile(orgId, fileId);
      downloadMimeType = mimeType;
      downloadFileName = fileName;
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": downloadMimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(downloadFileName)}"`,
      },
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to download file" },
      { status: 500 }
    );
  }
}
