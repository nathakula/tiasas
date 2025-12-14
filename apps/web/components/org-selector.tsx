"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@tiasas/database";

interface Membership {
  orgId: string;
  role: Role;
  org: {
    id: string;
    name: string;
  };
}

interface OrgSelectorProps {
  memberships: Membership[];
  activeOrg: string | null;
}

const ROLE_BADGES = {
  OWNER: "👑",
  ADMIN: "⚙️",
  MEMBER: "✏️",
  VIEWER: "👁️",
};

const ROLE_COLORS = {
  OWNER: "text-purple-600 dark:text-purple-400",
  ADMIN: "text-blue-600 dark:text-blue-400",
  MEMBER: "text-green-600 dark:text-green-400",
  VIEWER: "text-slate-500 dark:text-slate-400",
};

export function OrgSelector({ memberships, activeOrg }: OrgSelectorProps) {
  const router = useRouter();

  useEffect(() => {
    // If no cookie set yet, default to the first membership and persist it,
    // then refresh to hydrate server components with the cookie value.
    if (!activeOrg && memberships.length > 0) {
      const first = memberships[0].orgId;
      fetch("/api/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeOrg: first }),
      }).then(() => router.refresh());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Group by owned vs shared
  const ownedWorkspaces = memberships.filter((m) => m.role === "OWNER");
  const sharedWorkspaces = memberships.filter((m) => m.role !== "OWNER");

  const currentMembership = memberships.find((m) => m.orgId === activeOrg) || memberships[0];

  return (
    <div className="flex items-center gap-2">
      <select
        className="border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 min-w-[200px]"
        value={activeOrg ?? memberships[0]?.orgId}
        onChange={async (e) => {
          await fetch("/api/me", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activeOrg: e.target.value }),
          });
          router.refresh();
        }}
      >
        {ownedWorkspaces.length > 0 && (
          <optgroup label="My Workspaces">
            {ownedWorkspaces.map((m) => (
              <option key={m.orgId} value={m.orgId}>
                {ROLE_BADGES[m.role]} {m.org.name}
              </option>
            ))}
          </optgroup>
        )}
        {sharedWorkspaces.length > 0 && (
          <optgroup label="Shared With Me">
            {sharedWorkspaces.map((m) => (
              <option key={m.orgId} value={m.orgId}>
                {ROLE_BADGES[m.role]} {m.org.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {currentMembership && (
        <span
          className={`text-xs font-medium px-2 py-1 rounded ${ROLE_COLORS[currentMembership.role]}`}
          title={`Your role: ${currentMembership.role}`}
        >
          {currentMembership.role}
        </span>
      )}
    </div>
  );
}
