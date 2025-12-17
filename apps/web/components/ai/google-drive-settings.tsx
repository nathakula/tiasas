"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function GoogleDriveSettings() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const [folderId, setFolderId] = useState("");
  const [fileAgeFilterDays, setFileAgeFilterDays] = useState(30);

  const error = searchParams.get("error");
  const success = searchParams.get("success");

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/integrations/google-drive/status");
      const data = await res.json();
      setStatus(data);

      if (data.integration) {
        setFolderId(data.integration.folderId || "");
        setFileAgeFilterDays(data.integration.fileAgeFilterDays || 30);
      }
    } catch (error) {
      console.error("Error fetching status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const res = await fetch("/api/integrations/google-drive/connect", {
        method: "POST",
      });
      const data = await res.json();

      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        alert("Failed to initiate OAuth flow");
      }
    } catch (error) {
      console.error("Error connecting:", error);
      alert("Failed to connect");
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/integrations/google-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId,
          fileAgeFilterDays,
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
      } else {
        alert("Configuration saved successfully");
        fetchStatus();
      }
    } catch (error) {
      console.error("Error saving config:", error);
      alert("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/integrations/google-drive/test", {
        method: "POST",
      });
      const data = await res.json();
      setTestResult(data);
    } catch (error) {
      console.error("Error testing connection:", error);
      setTestResult({ success: false, error: "Failed to test connection" });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Google Drive? This will remove all cached file metadata.")) {
      return;
    }

    try {
      const res = await fetch("/api/integrations/google-drive", {
        method: "DELETE",
      });

      if (res.ok) {
        alert("Google Drive disconnected");
        fetchStatus();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to disconnect");
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
      alert("Failed to disconnect");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-600 mx-auto"></div>
        <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="card p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-red-700 dark:text-red-400">
            {error === "callback_failed" && "OAuth callback failed. Please try again."}
            {error === "missing_parameters" && "Missing required parameters from OAuth callback."}
            {error !== "callback_failed" && error !== "missing_parameters" && `Error: ${error}`}
          </p>
        </div>
      )}

      {success && (
        <div className="card p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <p className="text-green-700 dark:text-green-400">
            {success === "connected" && "Successfully connected to Google Drive!"}
          </p>
        </div>
      )}

      {/* Connection Status */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Connection Status
        </h2>

        {status?.connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-slate-700 dark:text-slate-300">Connected</span>
            </div>

            {status.integration?.isTokenExpired && (
              <div className="text-sm text-yellow-600 dark:text-yellow-400">
                Token expired - please reconnect
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleConnect}
                className="px-4 py-2 text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
              >
                Reconnect
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 text-sm border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></div>
              <span className="text-sm text-slate-700 dark:text-slate-300">Not Connected</span>
            </div>

            <button
              onClick={handleConnect}
              className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded transition-colors"
            >
              Connect Google Drive
            </button>

            <div className="text-sm text-slate-600 dark:text-slate-400">
              <p className="font-medium mb-2">Required permissions:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Read-only access to Google Drive files</li>
                <li>View metadata for files</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Form */}
      {status?.connected && (
        <form onSubmit={handleSaveConfig} className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Configuration
          </h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Folder ID
            </label>
            <input
              type="text"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              placeholder="Enter Google Drive folder ID"
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              required
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Find the folder ID in the folder URL after <code>/folders/</code>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              File Age Filter (days)
            </label>
            <input
              type="number"
              value={fileAgeFilterDays}
              onChange={(e) => setFileAgeFilterDays(parseInt(e.target.value) || 30)}
              min="0"
              max="365"
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Only include files modified within the last N days (0 = no filter)
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </form>
      )}

      {/* Test Connection */}
      {status?.connected && folderId && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Test Connection
          </h2>

          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="px-4 py-2 text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors disabled:opacity-50"
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>

          {testResult && (
            <div
              className={`p-4 rounded-md ${
                testResult.success
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
              }`}
            >
              {testResult.success ? (
                <div>
                  <p className="font-medium">✓ Connection successful</p>
                  {testResult.folderName && <p className="text-sm mt-1">Folder: {testResult.folderName}</p>}
                  {testResult.fileCount !== undefined && (
                    <p className="text-sm">Files accessible: {testResult.fileCount}</p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-medium">✗ Connection failed</p>
                  <p className="text-sm mt-1">{testResult.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="card p-6 space-y-3 text-sm text-slate-600 dark:text-slate-400">
        <h3 className="font-medium text-slate-900 dark:text-slate-100">How to use:</h3>
        <ol className="list-decimal list-inside space-y-2">
          <li>Click "Connect Google Drive" and authorize the app</li>
          <li>Create or navigate to a folder in Google Drive</li>
          <li>Copy the folder ID from the URL (the long string after <code>/folders/</code>)</li>
          <li>Paste the folder ID above and save</li>
          <li>Test the connection to verify access</li>
          <li>Navigate to "Drive Artifacts" tab to view files</li>
        </ol>
      </div>
    </div>
  );
}
