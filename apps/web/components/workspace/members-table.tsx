"use client";

import { useState } from "react";
import { Role } from "@tiasas/database";

interface Member {
  id: string;
  role: Role;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    createdAt: Date;
  };
}

interface MembersTableProps {
  members: Member[];
  currentUserId: string;
  currentUserRole: Role;
  isOwner: boolean;
}

const ROLE_COLORS = {
  OWNER: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  ADMIN: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  MEMBER: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  VIEWER: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
};

export function MembersTable({ members, currentUserId, currentUserRole, isOwner }: MembersTableProps) {
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    if (!confirm(`Change this member's role to ${newRole}?`)) return;

    setLoadingUserId(userId);
    try {
      const response = await fetch("/api/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to update role");
        return;
      }

      // Refresh the page to show updated role
      window.location.reload();
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update role");
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string | null) => {
    if (!confirm(`Remove ${userName || "this member"} from the workspace?`)) return;

    setLoadingUserId(userId);
    try {
      const response = await fetch(`/api/members?userId=${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to remove member");
        return;
      }

      // Refresh the page to show updated list
      window.location.reload();
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Failed to remove member");
    } finally {
      setLoadingUserId(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th className="text-left py-3 px-2 font-medium text-slate-900 dark:text-slate-100">
              Member
            </th>
            <th className="text-left py-3 px-2 font-medium text-slate-900 dark:text-slate-100">
              Role
            </th>
            <th className="text-left py-3 px-2 font-medium text-slate-900 dark:text-slate-100">
              Joined
            </th>
            {(isOwner || currentUserRole === "ADMIN") && (
              <th className="text-right py-3 px-2 font-medium text-slate-900 dark:text-slate-100">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const isCurrentUser = member.user.id === currentUserId;
            const canModify = isOwner && !isCurrentUser;
            const canRemove = (isOwner || currentUserRole === "ADMIN") && !isCurrentUser;

            return (
              <tr
                key={member.id}
                className="border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <td className="py-3 px-2">
                  <div className="flex items-center gap-3">
                    {member.user.image ? (
                      <img
                        src={member.user.image}
                        alt={member.user.name || "Avatar"}
                        className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs">
                        {(member.user.name || member.user.email || "?")
                          .slice(0, 1)
                          .toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {member.user.name || member.user.email}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                            (You)
                          </span>
                        )}
                      </div>
                      {member.user.name && (
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {member.user.email}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-2">
                  {canModify ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.user.id, e.target.value as Role)}
                      disabled={loadingUserId === member.user.id}
                      className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm disabled:opacity-50"
                    >
                      <option value="OWNER">OWNER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="MEMBER">MEMBER</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${ROLE_COLORS[member.role]}`}>
                      {member.role}
                    </span>
                  )}
                </td>
                <td className="py-3 px-2 text-slate-600 dark:text-slate-400">
                  {new Date(member.createdAt).toLocaleDateString()}
                </td>
                {(isOwner || currentUserRole === "ADMIN") && (
                  <td className="py-3 px-2 text-right">
                    {canRemove && (
                      <button
                        onClick={() => handleRemoveMember(member.user.id, member.user.name)}
                        disabled={loadingUserId === member.user.id}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm disabled:opacity-50"
                      >
                        {loadingUserId === member.user.id ? "Removing..." : "Remove"}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
