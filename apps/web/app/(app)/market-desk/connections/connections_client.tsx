"use client";

import { useState, useEffect } from "react";
import { BrokerProvider, BrokerConnectionStatus } from "@prisma/client";
import { Plus, RefreshCw, Trash2, Upload, AlertCircle, CheckCircle, Clock } from "lucide-react";

type Connection = {
  id: string;
  broker: BrokerProvider;
  status: BrokerConnectionStatus;
  lastSyncedAt: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
  accounts: Array<{
    id: string;
    nickname: string | null;
    maskedNumber: string | null;
    accountType: string | null;
    lastSyncedAt: string | null;
  }>;
  lastSync: {
    startedAt: string;
    finishedAt: string | null;
    result: string | null;
    message: string | null;
  } | null;
};

export default function ConnectionsClient({ orgId }: { orgId: string }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBrokerModal, setShowBrokerModal] = useState(false);

  useEffect(() => {
    loadConnections();
  }, [orgId]);

  async function loadConnections() {
    try {
      setLoading(true);
      const res = await fetch(`/api/brokerbridge/connections?orgId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections);
      }
    } catch (error) {
      console.error("Failed to load connections:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync(connectionId: string) {
    setSyncing((prev) => new Set(prev).add(connectionId));

    try {
      const res = await fetch(
        `/api/brokerbridge/connections/${connectionId}/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forceRefresh: false }),
        }
      );

      if (res.ok) {
        await loadConnections();
      } else {
        const error = await res.json();
        alert(`Sync failed: ${error.message || error.error}`);
      }
    } catch (error) {
      console.error("Sync error:", error);
      alert("Failed to sync connection");
    } finally {
      setSyncing((prev) => {
        const next = new Set(prev);
        next.delete(connectionId);
        return next;
      });
    }
  }

  async function handleDelete(connectionId: string) {
    if (!confirm("Are you sure you want to delete this connection? All associated data will be removed.")) {
      return;
    }

    try {
      const res = await fetch(`/api/brokerbridge/connections/${connectionId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadConnections();
      } else {
        const error = await res.json();
        alert(`Delete failed: ${error.message || error.error}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete connection");
    }
  }

  if (loading) {
    return <div className="text-center text-gray-600">Loading connections...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Upload className="h-4 w-4" />
          <span>Import CSV</span>
        </button>
        <button
          onClick={() => setShowBrokerModal(true)}
          className="flex items-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" />
          <span>Add Connection</span>
        </button>
      </div>

      {/* Connections List */}
      {connections.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No connections yet</h3>
          <p className="mt-2 text-gray-600">
            Import a CSV file or connect your brokerage account to get started.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 inline-flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Upload className="h-4 w-4" />
            <span>Import CSV</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((conn) => (
            <ConnectionCard
              key={conn.id}
              connection={conn}
              onSync={handleSync}
              onDelete={handleDelete}
              isSyncing={syncing.has(conn.id)}
            />
          ))}
        </div>
      )}

      {/* CSV Import Modal */}
      {showAddModal && (
        <CSVImportModal
          orgId={orgId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadConnections();
          }}
        />
      )}

      {/* Broker Selection Modal */}
      {showBrokerModal && (
        <BrokerSelectionModal
          orgId={orgId}
          onClose={() => setShowBrokerModal(false)}
        />
      )}
    </div>
  );
}

function ConnectionCard({
  connection,
  onSync,
  onDelete,
  isSyncing,
}: {
  connection: Connection;
  onSync: (id: string) => void;
  onDelete: (id: string) => void;
  isSyncing: boolean;
}) {
  const statusIcon = {
    [BrokerConnectionStatus.ACTIVE]: <CheckCircle className="h-5 w-5 text-green-500" />,
    [BrokerConnectionStatus.ERROR]: <AlertCircle className="h-5 w-5 text-red-500" />,
    [BrokerConnectionStatus.EXPIRED]: <Clock className="h-5 w-5 text-yellow-500" />,
    [BrokerConnectionStatus.DISCONNECTED]: <AlertCircle className="h-5 w-5 text-gray-400" />,
  }[connection.status];

  const statusColor = {
    [BrokerConnectionStatus.ACTIVE]: "text-green-700 bg-green-50",
    [BrokerConnectionStatus.ERROR]: "text-red-700 bg-red-50",
    [BrokerConnectionStatus.EXPIRED]: "text-yellow-700 bg-yellow-50",
    [BrokerConnectionStatus.DISCONNECTED]: "text-gray-700 bg-gray-50",
  }[connection.status];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
            <span className="text-lg font-semibold text-blue-700">
              {connection.broker.substring(0, 2)}
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {connection.broker.replace(/_/g, " ")}
              </h3>
              <span className={`flex items-center space-x-1 rounded px-2 py-1 text-xs font-medium ${statusColor}`}>
                {statusIcon}
                <span>{connection.status}</span>
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {connection.accounts.length} account{connection.accounts.length !== 1 ? "s" : ""}
              {connection.lastSyncedAt && (
                <span className="ml-2">
                  • Last synced {new Date(connection.lastSyncedAt).toLocaleString()}
                </span>
              )}
            </div>
            {connection.accounts.map((account) => (
              <div key={account.id} className="mt-2 text-sm text-gray-600">
                {account.nickname || account.id}
                {account.maskedNumber && ` (${account.maskedNumber})`}
              </div>
            ))}
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => onSync(connection.id)}
            disabled={isSyncing}
            className="flex items-center space-x-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync"}</span>
          </button>
          <button
            onClick={() => onDelete(connection.id)}
            className="rounded-lg border border-red-300 bg-white p-2 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {connection.lastSync && connection.lastSync.message && (
        <div className="mt-4 rounded bg-gray-50 p-3 text-sm text-gray-600">
          {connection.lastSync.message}
        </div>
      )}
    </div>
  );
}

type PreviewData = {
  success: boolean;
  fileName: string;
  detectedBroker?: {
    broker: string;
    confidence: string;
    displayName: string;
    detectedFrom: string;
  };
  summary: {
    totalRows: number;
    validPositions: number;
    errors: number;
    totalMarketValue: number;
    totalCostBasis: number;
    totalUnrealizedPL: number;
    byAssetClass: Record<string, number>;
    accountSummary?: {
      accountName?: string;
      netAccountValue?: number;
      totalGain?: number;
      totalGainPercent?: number;
    };
  };
  columnMapping: Record<string, string>;
  positions: Array<{
    row: number;
    symbol: string;
    quantity: number;
    averagePrice?: number;
    lastPrice?: number;
    marketValue?: number;
    costBasis?: number;
    unrealizedPL?: number;
    assetClass: string;
    isOption: boolean;
    optionDetails?: {
      underlying: string;
      strike: number;
      expiration: string;
      right: string;
    };
  }>;
  errors: Array<{ row: number; symbol: string; error: string }>;
  hasMore: boolean;
};

type BrokerOption = "ETRADE" | "FIDELITY" | "SCHWAB" | "ROBINHOOD" | "WEBULL" | "UNKNOWN";

function CSVImportModal({
  orgId,
  onClose,
  onSuccess,
}: {
  orgId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<BrokerOption>("UNKNOWN");
  const [accountNickname, setAccountNickname] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [existingConnectionName, setExistingConnectionName] = useState("");

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
    } else {
      alert('Please drop a CSV file');
    }
  }

  async function handlePreview() {
    if (!file) return;

    setPreviewing(true);

    try {
      const fileContent = await file.text();

      const res = await fetch("/api/brokerbridge/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileContent,
          fileName: file.name,
          fileType: "CSV",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPreview(data);
        // Auto-set broker from detection if confidence is not low
        if (data.detectedBroker && data.detectedBroker.confidence !== 'low') {
          setSelectedBroker(data.detectedBroker.broker as BrokerOption);
        }
      } else {
        const error = await res.json();
        alert(`Preview failed: ${error.message || error.error}\n${error.suggestion || ""}`);
      }
    } catch (error) {
      console.error("Preview error:", error);
      alert("Failed to preview file");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleConfirmImport() {
    if (!file) return;

    setUploading(true);

    try {
      const fileContent = await file.text();

      const res = await fetch("/api/brokerbridge/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          fileContent,
          fileName: file.name,
          fileType: "CSV",
          selectedBroker,
          accountNickname: accountNickname || file.name.replace(/\.csv$/i, ""),
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const error = await res.json();
        alert(`Import failed: ${error.message || error.error}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  }

  // Show preview if available
  if (preview) {
    return (
      <PreviewModal
        preview={preview}
        selectedBroker={selectedBroker}
        setSelectedBroker={setSelectedBroker}
        onBack={() => setPreview(null)}
        onConfirm={handleConfirmImport}
        uploading={uploading}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-gray-900">Import CSV File</h2>
        <p className="mt-2 text-sm text-gray-600">
          Upload a CSV file containing your positions. The file should include columns for Symbol, Quantity, and optionally Price/Value.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Broker
            </label>
            <select
              value={selectedBroker}
              onChange={(e) => setSelectedBroker(e.target.value as BrokerOption)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="ETRADE">E*TRADE</option>
              <option value="FIDELITY">Fidelity</option>
              <option value="SCHWAB">Charles Schwab</option>
              <option value="ROBINHOOD">Robinhood</option>
              <option value="WEBULL">Webull</option>
              <option value="UNKNOWN">Other / Unknown</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select your broker. This will be auto-detected after preview.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Account Nickname (optional)
            </label>
            <input
              type="text"
              value={accountNickname}
              onChange={(e) => setAccountNickname(e.target.value)}
              placeholder="e.g., Main Trading, IRA, Roth"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional: Give this account a memorable name
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CSV File</label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
                ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              `}
            >
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="pointer-events-none">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  {file ? (
                    <span className="font-medium text-blue-600">{file.name}</span>
                  ) : (
                    <>
                      <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                    </>
                  )}
                </p>
                <p className="mt-1 text-xs text-gray-500">CSV file only</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={previewing}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePreview}
            disabled={!file || previewing}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {previewing ? "Loading Preview..." : "Preview"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({
  preview,
  selectedBroker,
  setSelectedBroker,
  onBack,
  onConfirm,
  uploading,
}: {
  preview: PreviewData;
  selectedBroker: BrokerOption;
  setSelectedBroker: (broker: BrokerOption) => void;
  onBack: () => void;
  onConfirm: () => void;
  uploading: boolean;
}) {
  // Check if broker selection is required
  const isBrokerUnknown = selectedBroker === "UNKNOWN";
  const canImport = !isBrokerUnknown && preview.summary.validPositions > 0;
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatNumber = (value: number | undefined) => {
    if (value === undefined) return "—";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Import Preview: {preview.fileName}</h2>
          <p className="mt-1 text-sm text-gray-600">
            Review the parsed positions before importing
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">Valid Positions</div>
              <div className="text-2xl font-bold text-blue-900">{preview.summary.validPositions}</div>
              <div className="text-xs text-blue-600">of {preview.summary.totalRows} rows</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">Market Value</div>
              <div className="text-2xl font-bold text-green-900">{formatCurrency(preview.summary.totalMarketValue)}</div>
              <div className="text-xs text-green-600">Total portfolio value</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-medium">Cost Basis</div>
              <div className="text-2xl font-bold text-purple-900">{formatCurrency(preview.summary.totalCostBasis)}</div>
              <div className="text-xs text-purple-600">Total cost</div>
            </div>
            <div className={`${preview.summary.totalUnrealizedPL >= 0 ? 'bg-green-50' : 'bg-red-50'} rounded-lg p-4`}>
              <div className={`text-sm font-medium ${preview.summary.totalUnrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Unrealized P&L
              </div>
              <div className={`text-2xl font-bold ${preview.summary.totalUnrealizedPL >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {formatCurrency(preview.summary.totalUnrealizedPL)}
              </div>
              <div className={`text-xs ${preview.summary.totalUnrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {preview.summary.totalUnrealizedPL >= 0 ? 'Gain' : 'Loss'}
              </div>
            </div>
          </div>

          {/* Detected Broker Info */}
          {preview.detectedBroker && (
            <div className={`rounded-lg p-4 border-2 ${
              preview.detectedBroker.confidence === 'high' ? 'bg-green-50 border-green-200' :
              preview.detectedBroker.confidence === 'medium' ? 'bg-yellow-50 border-yellow-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Detected Broker: <span className="text-blue-600 font-bold">{preview.detectedBroker.displayName}</span>
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Confidence: {preview.detectedBroker.confidence} • {preview.detectedBroker.detectedFrom}
                  </p>
                </div>
                {preview.detectedBroker.confidence === 'high' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ Auto-detected
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Broker Selection - Required if UNKNOWN */}
          {isBrokerUnknown ? (
            <div className="rounded-lg bg-red-50 border-2 border-red-300 p-4">
              <div className="flex items-start space-x-3">
                <svg className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-900">
                    Broker Selection Required
                  </h3>
                  <p className="mt-1 text-sm text-red-800">
                    We couldn't automatically detect your broker. Please select it from the dropdown below to continue.
                  </p>
                  <div className="mt-3">
                    <select
                      value={selectedBroker}
                      onChange={(e) => setSelectedBroker(e.target.value as BrokerOption)}
                      className="w-full rounded-lg border-2 border-red-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
                    >
                      <option value="UNKNOWN" disabled>-- Select Your Broker --</option>
                      <option value="ETRADE">E*TRADE</option>
                      <option value="FIDELITY">Fidelity</option>
                      <option value="SCHWAB">Charles Schwab</option>
                      <option value="ROBINHOOD">Robinhood</option>
                      <option value="WEBULL">Webull</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <label className="block text-sm font-medium text-blue-900 mb-2">
                Confirm Broker (you can change if detection was incorrect)
              </label>
              <select
                value={selectedBroker}
                onChange={(e) => setSelectedBroker(e.target.value as BrokerOption)}
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="ETRADE">E*TRADE</option>
                <option value="FIDELITY">Fidelity</option>
                <option value="SCHWAB">Charles Schwab</option>
                <option value="ROBINHOOD">Robinhood</option>
                <option value="WEBULL">Webull</option>
                <option value="UNKNOWN">Other / Unknown</option>
              </select>
            </div>
          )}

          {/* Account Summary (if available) */}
          {preview.summary.accountSummary && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Account Summary from CSV</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {preview.summary.accountSummary.accountName && (
                  <div>
                    <span className="text-gray-500">Account:</span>
                    <span className="ml-2 font-medium">{preview.summary.accountSummary.accountName}</span>
                  </div>
                )}
                {preview.summary.accountSummary.netAccountValue && (
                  <div>
                    <span className="text-gray-500">Net Account Value:</span>
                    <span className="ml-2 font-medium">{formatCurrency(preview.summary.accountSummary.netAccountValue)}</span>
                  </div>
                )}
                {preview.summary.accountSummary.totalGain && (
                  <div>
                    <span className="text-gray-500">Total Gain:</span>
                    <span className="ml-2 font-medium">{formatCurrency(preview.summary.accountSummary.totalGain)}</span>
                  </div>
                )}
                {preview.summary.accountSummary.totalGainPercent !== undefined && (
                  <div>
                    <span className="text-gray-500">Total Gain %:</span>
                    <span className="ml-2 font-medium">{preview.summary.accountSummary.totalGainPercent.toFixed(2)}%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Asset Class Breakdown */}
          {Object.keys(preview.summary.byAssetClass).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">By Asset Class</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(preview.summary.byAssetClass).map(([assetClass, count]) => (
                  <span
                    key={assetClass}
                    className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700"
                  >
                    {assetClass}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Column Mapping */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Detected Column Mapping</h3>
            <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono">
              {Object.entries(preview.columnMapping).map(([field, column]) => (
                <div key={field} className="text-gray-600">
                  <span className="text-blue-600">{field}</span> → "{column}"
                </div>
              ))}
            </div>
          </div>

          {/* Errors (if any) */}
          {preview.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">
                Errors ({preview.errors.length})
              </h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {preview.errors.map((error, idx) => (
                  <div key={idx} className="text-xs text-red-700">
                    Row {error.row}: {error.symbol} - {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Positions Table */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Positions Preview ({preview.positions.length}{preview.hasMore ? "+ more" : ""})
            </h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Avg Price</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Last Price</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Market Value</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cost Basis</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unrealized P&L</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.positions.map((pos, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm">
                        <div className="font-medium text-gray-900">{pos.symbol}</div>
                        {pos.isOption && pos.optionDetails && (
                          <div className="text-xs text-gray-500">
                            {pos.optionDetails.underlying} ${pos.optionDetails.strike} {pos.optionDetails.right} {pos.optionDetails.expiration}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600">{pos.assetClass}</td>
                      <td className="px-3 py-2 text-sm text-right font-mono">{formatNumber(pos.quantity)}</td>
                      <td className="px-3 py-2 text-sm text-right font-mono">{formatCurrency(pos.averagePrice)}</td>
                      <td className="px-3 py-2 text-sm text-right font-mono">{formatCurrency(pos.lastPrice)}</td>
                      <td className="px-3 py-2 text-sm text-right font-mono font-medium">{formatCurrency(pos.marketValue)}</td>
                      <td className="px-3 py-2 text-sm text-right font-mono">{formatCurrency(pos.costBasis)}</td>
                      <td className={`px-3 py-2 text-sm text-right font-mono font-medium ${
                        pos.unrealizedPL && pos.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(pos.unrealizedPL)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.hasMore && (
              <p className="mt-2 text-xs text-gray-500 italic">
                Showing first {preview.positions.length} positions. All positions will be imported.
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          <button
            onClick={onBack}
            disabled={uploading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            ← Back
          </button>
          <div className="flex items-center space-x-3">
            {isBrokerUnknown ? (
              <div className="text-sm text-red-600 font-medium">
                ⚠️ Please select a broker to continue
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                Ready to import {preview.summary.validPositions} position{preview.summary.validPositions !== 1 ? 's' : ''}
              </div>
            )}
            <button
              onClick={onConfirm}
              disabled={uploading || !canImport}
              className="rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={isBrokerUnknown ? "Please select a broker first" : ""}
            >
              {uploading ? "Importing..." : "Confirm Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrokerSelectionModal({
  orgId,
  onClose,
}: {
  orgId: string;
  onClose: () => void;
}) {
  const [connecting, setConnecting] = useState(false);

  async function handleConnectEtrade() {
    setConnecting(true);
    try {
      const res = await fetch(`/api/brokerbridge/etrade/auth?orgId=${orgId}`);
      const data = await res.json();

      if (data.authorizationUrl) {
        // Redirect to E*TRADE authorization page
        window.location.href = data.authorizationUrl;
      } else {
        alert(`Failed to initiate E*TRADE connection: ${data.error || 'Unknown error'}`);
        setConnecting(false);
      }
    } catch (error) {
      console.error('E*TRADE connection error:', error);
      alert('Failed to connect to E*TRADE');
      setConnecting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-gray-900">Connect Broker Account</h2>
        <p className="mt-2 text-sm text-gray-600">
          Choose a broker to connect to your account.
        </p>

        <div className="mt-6 space-y-3">
          {/* E*TRADE */}
          <button
            onClick={handleConnectEtrade}
            disabled={connecting}
            className="w-full flex items-center justify-between rounded-lg border border-gray-300 bg-white p-4 hover:bg-gray-50 disabled:opacity-50"
          >
            <div className="text-left">
              <div className="font-medium text-gray-900">E*TRADE</div>
              <div className="text-sm text-gray-500">Connect via OAuth</div>
            </div>
            <div className="text-2xl">💼</div>
          </button>

          {/* Coming Soon */}
          <button
            disabled
            className="w-full flex items-center justify-between rounded-lg border border-gray-300 bg-gray-100 p-4 cursor-not-allowed opacity-50"
          >
            <div className="text-left">
              <div className="font-medium text-gray-900">Robinhood</div>
              <div className="text-sm text-gray-500">Coming soon</div>
            </div>
            <div className="text-2xl">🏹</div>
          </button>

          <button
            disabled
            className="w-full flex items-center justify-between rounded-lg border border-gray-300 bg-gray-100 p-4 cursor-not-allowed opacity-50"
          >
            <div className="text-left">
              <div className="font-medium text-gray-900">Fidelity</div>
              <div className="text-sm text-gray-500">Coming soon</div>
            </div>
            <div className="text-2xl">🏦</div>
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            disabled={connecting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
