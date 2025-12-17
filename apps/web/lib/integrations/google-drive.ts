import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { decryptToken, encryptToken } from "./encryption";
import { db as prisma } from "@/lib/db";

/**
 * Google Drive API scopes (read-only)
 */
export const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

/**
 * Create OAuth2 client
 */
export function createOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Google OAuth configuration");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate authorization URL for OAuth flow
 */
export function getAuthorizationUrl(state: string): string {
  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: DRIVE_SCOPES,
    state,
    prompt: "consent", // Force consent screen to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  scope: string;
}> {
  const oauth2Client = createOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Failed to obtain tokens");
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date || Date.now() + 3600 * 1000,
    scope: tokens.scope || DRIVE_SCOPES.join(" "),
  };
}

/**
 * Get authenticated Drive API client for an org
 */
export async function getDriveClient(orgId: string) {
  const integration = await prisma.integrationGoogleDrive.findUnique({
    where: { orgId },
  });

  if (!integration || !integration.enabled) {
    throw new Error("Google Drive integration not configured");
  }

  const oauth2Client = createOAuth2Client();

  // Decrypt refresh token
  const refreshToken = decryptToken(integration.refreshTokenEncrypted);

  // Set credentials
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
    access_token: integration.accessToken || undefined,
    expiry_date: integration.tokenExpiry?.getTime() || undefined,
  });

  // Auto-refresh if needed
  oauth2Client.on("tokens", async (tokens) => {
    // Update access token in database
    await prisma.integrationGoogleDrive.update({
      where: { id: integration.id },
      data: {
        accessToken: tokens.access_token || undefined,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
    });
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

/**
 * List files in the configured Drive folder
 */
export async function listDriveFiles(
  orgId: string,
  options: {
    query?: string;
    mimeType?: string;
    pageToken?: string;
    pageSize?: number;
  } = {}
) {
  const integration = await prisma.integrationGoogleDrive.findUnique({
    where: { orgId },
  });

  if (!integration) {
    throw new Error("Google Drive integration not configured");
  }

  const drive = await getDriveClient(orgId);

  // Build query
  let q = `'${integration.folderId}' in parents and trashed = false`;

  // Add file age filter
  if (integration.fileAgeFilterDays > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - integration.fileAgeFilterDays);
    q += ` and modifiedTime > '${cutoffDate.toISOString()}'`;
  }

  // Add search query
  if (options.query) {
    q += ` and name contains '${options.query.replace(/'/g, "\\'")}'`;
  }

  // Add mime type filter
  if (options.mimeType) {
    q += ` and mimeType = '${options.mimeType}'`;
  }

  const response = await drive.files.list({
    q,
    pageSize: options.pageSize || 50,
    pageToken: options.pageToken,
    fields: "nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink, iconLink, thumbnailLink)",
    orderBy: "modifiedTime desc",
  });

  return {
    files: response.data.files || [],
    nextPageToken: response.data.nextPageToken || undefined,
  };
}

/**
 * Get file metadata
 */
export async function getFileMetadata(orgId: string, fileId: string) {
  const drive = await getDriveClient(orgId);

  const response = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, modifiedTime, size, webViewLink, iconLink, thumbnailLink, description",
  });

  return response.data;
}

/**
 * Export Google Doc as HTML
 */
export async function exportDocAsHtml(orgId: string, fileId: string): Promise<string> {
  const drive = await getDriveClient(orgId);

  const response = await drive.files.export(
    {
      fileId,
      mimeType: "text/html",
    },
    { responseType: "text" }
  );

  return response.data as string;
}

/**
 * Export Google Sheet as CSV
 */
export async function exportSheetAsCsv(orgId: string, fileId: string): Promise<string> {
  const drive = await getDriveClient(orgId);

  const response = await drive.files.export(
    {
      fileId,
      mimeType: "text/csv",
    },
    { responseType: "text" }
  );

  return response.data as string;
}

/**
 * Export Google Doc/Slides as PDF
 */
export async function exportAsPdf(orgId: string, fileId: string): Promise<Buffer> {
  const drive = await getDriveClient(orgId);

  const response = await drive.files.export(
    {
      fileId,
      mimeType: "application/pdf",
    },
    { responseType: "arraybuffer" }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

/**
 * Download file (for native PDFs, images, etc.)
 */
export async function downloadFile(orgId: string, fileId: string): Promise<Buffer> {
  const drive = await getDriveClient(orgId);

  const response = await drive.files.get(
    {
      fileId,
      alt: "media",
    },
    { responseType: "arraybuffer" }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

/**
 * Test connection - verify token and folder access
 */
export async function testConnection(orgId: string): Promise<{
  success: boolean;
  folderName?: string;
  fileCount?: number;
  error?: string;
}> {
  try {
    const integration = await prisma.integrationGoogleDrive.findUnique({
      where: { orgId },
    });

    if (!integration) {
      return { success: false, error: "Integration not found" };
    }

    const drive = await getDriveClient(orgId);

    // Try to get folder metadata
    const folder = await drive.files.get({
      fileId: integration.folderId,
      fields: "id, name, mimeType",
    });

    if (folder.data.mimeType !== "application/vnd.google-apps.folder") {
      return { success: false, error: "Specified ID is not a folder" };
    }

    // Try to list files
    const { files } = await listDriveFiles(orgId, { pageSize: 1 });

    return {
      success: true,
      folderName: folder.data.name || undefined,
      fileCount: files.length,
    };
  } catch (error: any) {
    console.error("Drive connection test failed:", error);
    return {
      success: false,
      error: error.message || "Connection test failed",
    };
  }
}
