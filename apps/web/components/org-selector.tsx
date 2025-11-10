"use client";
import { useRouter } from "next/navigation";

export function OrgSelector({ memberships, activeOrg }: { memberships: { orgId: string; org: { id: string; name: string } }[]; activeOrg: string | null }) {
  const router = useRouter();
  return (
    <select
      className="border rounded-md px-2 py-1 text-sm"
      defaultValue={activeOrg ?? undefined}
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

