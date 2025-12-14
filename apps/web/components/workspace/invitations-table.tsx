"use client";

import { useState } from "react";
import { Role } from "@tiasas/database";

interface Invitation {
  id: string;
  email: string;
  role: Role;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  inviter: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

interface InvitationsTableProps {
  invitations: Invitation[];
}

const ROLE_COLORS = {
  OWNER: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  ADMIN: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  MEMBER: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  VIEWER: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
};

export function InvitationsTable({ invitations }: InvitationsTableProps) {
  const [loadingToken, setLoadingToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleCancelInvitation = async (token: string, email: string) => {
    if (!confirm(`Cancel invitation for ${email}?`)) return;

    setLoadingToken(token);
    try {
      const response = await fetch(`/api/invitations?token=${token}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to cancel invitation");
        return;
      }

      // Refresh the page to show updated list
      window.location.reload();
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      alert("Failed to cancel invitation");
    } finally {
      setLoadingToken(null);
    }
  };

  const copyInviteLink = async (token: string) => {
    const inviteUrl = `${window.location.origin}/accept-invite?token=${token}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      alert("Failed to copy link");
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th className="text-left py-3 px-2 font-medium text-slate-900 dark:text-slate-100">
              Email
            </th>
            <th className="text-left py-3 px-2 font-medium text-slate-900 dark:text-slate-100">
              Role
            </th>
            <th className="text-left py-3 px-2 font-medium text-slate-900 dark:text-slate-100">
              Invited By
            </th>
            <th className="text-left py-3 px-2 font-medium text-slate-900 dark:text-slate-100">
              Expires
            </th>
            <th className="text-right py-3 px-2 font-medium text-slate-900 dark:text-slate-100">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((invitation) => {
            const expiresIn = Math.ceil(
              (new Date(invitation.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );

            return (
              <tr
                key={invitation.id}
                className="border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <td className="py-3 px-2">
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {invitation.email}
                  </div>
                </td>
                <td className="py-3 px-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${ROLE_COLORS[invitation.role]}`}>
                    {invitation.role}
                  </span>
                </td>
                <td className="py-3 px-2 text-slate-600 dark:text-slate-400">
                  {invitation.inviter.name || invitation.inviter.email}
                </td>
                <td className="py-3 px-2 text-slate-600 dark:text-slate-400">
                  {expiresIn > 0 ? `${expiresIn} day${expiresIn === 1 ? "" : "s"}` : "Expired"}
                </td>
                <td className="py-3 px-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => copyInviteLink(invitation.token)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                    >
                      {copiedToken === invitation.token ? "Copied!" : "Copy Link"}
                    </button>
                    <button
                      onClick={() => handleCancelInvitation(invitation.token, invitation.email)}
                      disabled={loadingToken === invitation.token}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm disabled:opacity-50"
                    >
                      {loadingToken === invitation.token ? "Cancelling..." : "Cancel"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
