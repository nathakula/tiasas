"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
}

export function DriveArtifacts() {
  const [status, setStatus] = useState<any>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [viewerContent, setViewerContent] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);

  // Fetch integration status
  useEffect(() => {
    fetchStatus();
  }, []);

  // Fetch files when status changes
  useEffect(() => {
    if (status?.connected) {
      fetchFiles();
    }
  }, [status, searchQuery, typeFilter]);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/integrations/google-drive/status");
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error("Error fetching status:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    setFilesLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("query", searchQuery);
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`/api/integrations/google-drive/files?${params}`);
      const data = await res.json();

      if (data.error) {
        console.error("Error fetching files:", data.error);
        setFiles([]);
      } else {
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  };

  const handleFileClick = async (file: DriveFile) => {
    setSelectedFile(file);
    setViewerContent(null);
    setViewerLoading(true);

    try {
      // Check if file type is viewable
      const viewableMimeTypes = [
        "application/vnd.google-apps.document",
        "application/vnd.google-apps.spreadsheet",
        "application/pdf",
        "image/",
      ];

      const isViewable = viewableMimeTypes.some((type) =>
        file.mimeType.startsWith(type)
      );

      if (isViewable) {
        const res = await fetch(`/api/integrations/google-drive/file/${file.id}/render`);

        if (res.ok) {
          const contentType = res.headers.get("content-type");

          if (contentType?.includes("text/html")) {
            const html = await res.text();
            setViewerContent(html);
          } else if (contentType?.includes("text/csv")) {
            const csv = await res.text();
            // Convert CSV to simple table
            const rows = csv.split("\n").map((row) => row.split(","));
            const tableHtml = `
              <table class="w-full border-collapse">
                <thead>
                  <tr class="bg-slate-100 dark:bg-slate-800">
                    ${rows[0].map((cell) => `<th class="border border-slate-300 dark:border-slate-700 px-2 py-1">${cell}</th>`).join("")}
                  </tr>
                </thead>
                <tbody>
                  ${rows
                    .slice(1)
                    .map(
                      (row) =>
                        `<tr>${row.map((cell) => `<td class="border border-slate-300 dark:border-slate-700 px-2 py-1">${cell}</td>`).join("")}</tr>`
                    )
                    .join("")}
                </tbody>
              </table>
            `;
            setViewerContent(tableHtml);
          } else if (contentType?.includes("application/pdf")) {
            // For PDF, create an iframe viewer
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setViewerContent(`<iframe src="${url}" class="w-full h-full min-h-[600px]" />`);
          } else if (contentType?.startsWith("image/")) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setViewerContent(`<img src="${url}" class="max-w-full" alt="${file.name}" />`);
          }
        } else {
          const data = await res.json();
          setViewerContent(`<div class="text-red-600">Unable to render file: ${data.error || "Unknown error"}</div>`);
        }
      } else {
        setViewerContent(`
          <div class="text-center py-8">
            <p class="text-slate-600 dark:text-slate-400 mb-4">
              This file type cannot be previewed in-app.
            </p>
            <a
              href="/api/integrations/google-drive/file/${file.id}/download"
              download
              class="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded transition-colors inline-block"
            >
              Download File
            </a>
          </div>
        `);
      }
    } catch (error) {
      console.error("Error rendering file:", error);
      setViewerContent(`<div class="text-red-600">Error loading file</div>`);
    } finally {
      setViewerLoading(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("document")) return "📄";
    if (mimeType.includes("spreadsheet")) return "📊";
    if (mimeType.includes("presentation")) return "📽️";
    if (mimeType.includes("pdf")) return "📕";
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType.includes("csv")) return "📈";
    return "📎";
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-600 mx-auto"></div>
        <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="card p-8 text-center">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
          Google Drive Not Connected
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Connect your Google Drive folder to view research artifacts here.
        </p>
        <Link
          href="/market-desk/ai/settings/integrations/google-drive"
          className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded transition-colors inline-block"
        >
          Configure Integration
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border border-input bg-background rounded-md text-sm"
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="">All Types</option>
            <option value="docs">Docs</option>
            <option value="sheets">Sheets</option>
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
            <option value="images">Images</option>
          </select>

          <button
            onClick={fetchFiles}
            disabled={filesLoading}
            className="px-4 py-2 text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors disabled:opacity-50"
          >
            {filesLoading ? "Refreshing..." : "Refresh"}
          </button>

          <Link
            href="/market-desk/ai/settings/integrations/google-drive"
            className="px-4 py-2 text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* File List and Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* File List */}
        <div className="card p-4 max-h-[600px] overflow-y-auto">
          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-4">
            Files ({files.length})
          </h3>

          {filesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600 mx-auto"></div>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-slate-600 dark:text-slate-400">
              No files found
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className={`w-full text-left p-3 rounded-md border transition-colors ${
                    selectedFile?.id === file.id
                      ? "border-gold-600 bg-gold-50 dark:bg-gold-900/20"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{getFileIcon(file.mimeType)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate text-slate-900 dark:text-slate-100">
                        {file.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {new Date(file.modifiedTime).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* File Viewer */}
        <div className="card p-4 max-h-[600px] overflow-y-auto">
          {!selectedFile ? (
            <div className="text-center py-8 text-slate-600 dark:text-slate-400">
              Select a file to preview
            </div>
          ) : viewerLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600 mx-auto"></div>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Loading {selectedFile.name}...</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                <h4 className="font-medium text-sm truncate text-slate-900 dark:text-slate-100">
                  {selectedFile.name}
                </h4>
                <a
                  href={`/api/integrations/google-drive/file/${selectedFile.id}/download`}
                  download
                  className="px-3 py-1 text-xs border border-input bg-background hover:bg-accent rounded transition-colors"
                >
                  Download
                </a>
              </div>
              <div
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: viewerContent || "" }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
