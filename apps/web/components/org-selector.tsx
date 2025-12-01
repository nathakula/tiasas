"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function OrgSelector({ memberships, activeOrg }: { memberships: { orgId: string; org: { id: string; name: string } }[]; activeOrg: string | null }) {
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

  return (
    <select
      className="border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
      defaultValue={activeOrg ?? memberships[0]?.orgId}
      onChange={async (e) => {
        await fetch("/api/me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activeOrg: e.target.value }) });
        router.refresh();
      }}
    >
      {memberships.map((m) => (
        <option key={m.orgId} value={m.orgId}>
          {m.org.name}
        </option>
      ))}
    </select>
  );
}
