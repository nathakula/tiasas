"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  before: any;
  after: any;
  at: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

interface AuditLogTableProps {
  logs: AuditLog[];
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  LOGOUT: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
  ACCESS_DENIED: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  INVITE_SENT: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  INVITE_ACCEPTED: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  INVITE_CANCELLED: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
  ROLE_CHANGED: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  MEMBER_REMOVED: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  CREATE: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  UPDATE: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  DELETE: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
};

function getActionLabel(action: string, after: any): string {
  switch (action) {
    case "LOGIN":
      return `Logged in via ${after?.method || "unknown"}`;
    case "LOGOUT":
      return "Logged out";
    case "ACCESS_DENIED":
      return `Access denied (required: ${after?.required || "?"}, actual: ${after?.actual || "?"})`;
    case "INVITE_SENT":
      return `Invited ${after?.email || "user"} as ${after?.role || "?"}`;
    case "INVITE_ACCEPTED":
      return `Accepted invitation as ${after?.role || "?"}`;
    case "INVITE_CANCELLED":
      return "Cancelled invitation";
    case "ROLE_CHANGED":
      const before = after?.userId ? `member` : "unknown";
      return `Changed role from ${action === "ROLE_CHANGED" ? "previous" : ""} to ${after?.role || "?"}`;
    case "MEMBER_REMOVED":
      return "Removed member from workspace";
    default:
      return action;
  }
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
  const [filter, setFilter] = useState<string>("");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (!filter) return true;
    return (
      log.action.toLowerCase().includes(filter.toLowerCase()) ||
      log.entity.toLowerCase().includes(filter.toLowerCase()) ||
      log.user?.name?.toLowerCase().includes(filter.toLowerCase()) ||
      log.user?.email?.toLowerCase().includes(filter.toLowerCase())
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Filter logs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm px-3 py-2 border border-input bg-background rounded-md text-sm"
        />
        <span className="text-sm text-muted-foreground">
          {filteredLogs.length} {filteredLogs.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Action
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Entity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No audit logs found
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(log.at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      {log.user?.image && (
                        <img
                          src={log.user.image}
                          alt={log.user.name || "User"}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <div>
                        <div className="font-medium">{log.user?.name || "System"}</div>
                        {log.user?.email && (
                          <div className="text-xs text-muted-foreground">{log.user.email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ACTION_COLORS[log.action] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{log.entity}</td>
                  <td className="px-4 py-3 text-sm">
                    <div>{getActionLabel(log.action, log.after)}</div>
                    {expandedLog === log.id && (log.before || log.after) && (
                      <div className="mt-2 p-2 bg-muted/30 rounded text-xs font-mono space-y-1">
                        {log.before && (
                          <div>
                            <span className="text-muted-foreground">Before:</span>{" "}
                            {JSON.stringify(log.before, null, 2)}
                          </div>
                        )}
                        {log.after && (
                          <div>
                            <span className="text-muted-foreground">After:</span>{" "}
                            {JSON.stringify(log.after, null, 2)}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
