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
          onClick={() => alert("Coming soon: Connect live broker")}
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
  const [accountNickname, setAccountNickname] = useState("");

  async function handleUpload() {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-gray-900">Import CSV File</h2>
        <p className="mt-2 text-sm text-gray-600">
          Upload a CSV file containing your positions. The file should include columns for Symbol, Quantity, and optionally Price/Value.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Account Nickname (optional)
            </label>
            <input
              type="text"
              value={accountNickname}
              onChange={(e) => setAccountNickname(e.target.value)}
              placeholder="My Portfolio"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 w-full"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? "Importing..." : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
