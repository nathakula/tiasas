# Google Drive Integration - Setup Guide

## Overview

The Google Drive Integration allows you to surface research artifacts (docs, sheets, PDFs, images) from a Google Drive folder directly inside the Analyst Bench at `/market-desk/ai`.

## Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:13000/api/integrations/google-drive/callback

# Integration Token Encryption Key (64-character hex string)
INTEGRATION_TOKEN_ENCRYPTION_KEY=generate-with-node-crypto-randomBytes-32-toString-hex

# App Base URL (used for OAuth redirects)
APP_BASE_URL=http://localhost:13000
```

### Generating the Encryption Key

Run this command in Node.js to generate a secure encryption key:

```javascript
require('crypto').randomBytes(32).toString('hex')
```

Or use this one-liner:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Google Cloud Console Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Drive API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### 2. Configure OAuth Consent Screen

1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Select **External** user type (or Internal if using Google Workspace)
3. Fill in application details:
   - App name: "TIASAS Market Desk"
   - User support email: your email
   - Developer contact: your email
4. Add scopes:
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/drive.metadata.readonly`
5. Add test users (your email addresses that will use the integration)
6. Save and continue

### 3. Create OAuth Credentials

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Application type: **Web application**
4. Name: "TIASAS Drive Integration"
5. Authorized redirect URIs:
   - `http://localhost:13000/api/integrations/google-drive/callback` (development)
   - `https://your-production-domain.com/api/integrations/google-drive/callback` (production)
6. Click "Create"
7. Copy the **Client ID** and **Client Secret**

### 4. Update Environment Variables

Add the credentials to your `.env` file:

```bash
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret
```

## Application Setup

### 1. Database Migration

The Prisma schema has been updated with the following models:

- `IntegrationGoogleDrive` - Stores OAuth tokens and configuration
- `GoogleDriveFileCache` - Caches file metadata for performance

The database has already been updated via `prisma db push`.

### 2. Install Dependencies

The required packages have been installed:

```bash
pnpm add googleapis google-auth-library
```

### 3. Build and Restart

```bash
pnpm build
# Then restart the service
```

## Usage

### Admin Configuration

1. Navigate to `/market-desk/ai`
2. Click the "📁 Drive Artifacts" tab
3. Click "Configure Integration"
4. Click "Connect Google Drive"
5. Authorize the application in Google OAuth flow
6. After redirect, enter your Google Drive **Folder ID**:
   - Open the folder in Google Drive
   - Copy the ID from the URL: `https://drive.google.com/drive/folders/YOUR_FOLDER_ID_HERE`
7. Optionally configure "File Age Filter" (default: 30 days)
8. Click "Save Configuration"
9. Click "Test Connection" to verify

### Viewing Files

1. Go to `/market-desk/ai`
2. Click "📁 Drive Artifacts" tab
3. Browse files from your connected folder
4. Use search and type filters
5. Click a file to preview:
   - **Google Docs** → Rendered as HTML
   - **Google Sheets** → Exported as CSV table
   - **PDFs** → Embedded PDF viewer
   - **Images** → Direct image display
   - **Other types** → Download button

## Security

- **Read-only access**: Integration uses least-privilege scopes
- **Encrypted tokens**: Refresh tokens are encrypted at rest using AES-256-GCM
- **No data retention**: Files are not stored; only metadata is cached
- **Org-scoped**: Each workspace has its own integration
- **Admin-only**: Only ADMIN and OWNER roles can configure

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/integrations/google-drive/connect` | POST | Initiate OAuth flow |
| `/api/integrations/google-drive/callback` | GET | OAuth callback handler |
| `/api/integrations/google-drive/status` | GET | Get integration status |
| `/api/integrations/google-drive/test` | POST | Test connection |
| `/api/integrations/google-drive/files` | GET | List files |
| `/api/integrations/google-drive/file/[id]/render` | GET | Render file content |
| `/api/integrations/google-drive/file/[id]/download` | GET | Download file |
| `/api/integrations/google-drive` | POST | Save configuration |
| `/api/integrations/google-drive` | DELETE | Disconnect integration |

## Troubleshooting

### "OAuth callback failed"

- Verify `GOOGLE_REDIRECT_URI` matches the redirect URI configured in Google Cloud Console
- Check that the Google Drive API is enabled
- Ensure test users are added to OAuth consent screen

### "Connection test failed"

- Verify the folder ID is correct
- Ensure the authenticated Google account has access to the folder
- Check that folder permissions allow the OAuth app to read files

### "Token expired"

- Click "Reconnect" in settings to refresh the OAuth token
- Tokens automatically refresh when accessing files

### Files not appearing

- Check the "File Age Filter" setting
- Verify files are in the specified folder (not in subfolders)
- Ensure files are not trashed
- Click "Refresh" to force a new fetch

## File Type Support

| Type | Mime Type | Render Method |
|------|-----------|---------------|
| Google Docs | `application/vnd.google-apps.document` | Export as HTML |
| Google Sheets | `application/vnd.google-apps.spreadsheet` | Export as CSV table |
| Google Slides | `application/vnd.google-apps.presentation` | Export as PDF |
| PDF | `application/pdf` | Embedded viewer |
| Images | `image/*` | Direct display |
| CSV | `text/csv` | Table view |
| Other | - | Download only |

## Limitations

- Subfolders are not scanned (only direct children of the configured folder)
- File preview size limit: ~10MB for optimal performance
- Cached metadata updates on file list fetch
- OAuth consent screen shows "unverified app" warning unless app is verified by Google

## Production Deployment

1. Update `GOOGLE_REDIRECT_URI` to production domain
2. Update `APP_BASE_URL` to production URL
3. Add production redirect URI to Google Cloud Console
4. Consider applying for OAuth app verification if needed
5. Ensure `INTEGRATION_TOKEN_ENCRYPTION_KEY` is securely stored (use secrets manager)
6. Set up monitoring for token refresh failures

## Support

For issues or questions:
- Check the audit logs at `/settings/workspace/audit-logs`
- Review browser console for client-side errors
- Check server logs for API errors
