import { NextRequest, NextResponse } from "next/server";
import { requireAuthOrgMembership } from "@/app/api/route-helpers";
import {
  getFileMetadata,
  exportDocAsHtml,
  exportSheetAsCsv,
  exportAsPdf,
  downloadFile,
} from "@/lib/integrations/google-drive";

/**
 * GET /api/integrations/google-drive/file/[id]/render
 * Render file content (export or download as appropriate)
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

    // Handle different file types
    if (mimeType === "application/vnd.google-apps.document") {
      // Google Doc - export as HTML
      const html = await exportDocAsHtml(orgId, fileId);
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    } else if (mimeType === "application/vnd.google-apps.spreadsheet") {
      // Google Sheet - export as CSV
      const csv = await exportSheetAsCsv(orgId, fileId);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
        },
      });
    } else if (
      mimeType === "application/vnd.google-apps.presentation" ||
      mimeType === "application/vnd.google-apps.drawing"
    ) {
      // Google Slides/Drawings - export as PDF
      const pdf = await exportAsPdf(orgId, fileId);
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
        },
      });
    } else if (mimeType.startsWith("image/")) {
      // Images - download directly
      const file = await downloadFile(orgId, fileId);
      return new NextResponse(new Uint8Array(file), {
        headers: {
          "Content-Type": mimeType,
        },
      });
    } else if (mimeType === "application/pdf") {
      // PDF - download directly
      const file = await downloadFile(orgId, fileId);
      return new NextResponse(new Uint8Array(file), {
        headers: {
          "Content-Type": "application/pdf",
        },
      });
    } else {
      // Unsupported type - return metadata
      return NextResponse.json({
        error: "Unsupported file type for rendering",
        metadata: {
          id: metadata.id,
          name: metadata.name,
          mimeType: metadata.mimeType,
          size: metadata.size,
          webViewLink: metadata.webViewLink,
        },
      });
    }
  } catch (error) {
    console.error("Error rendering file:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to render file" },
      { status: 500 }
    );
  }
}
