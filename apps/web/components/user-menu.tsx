"use client";
import { signOut } from "next-auth/react";

export function UserMenu({ name }: { name?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      {name ? <span className="text-sm text-slate-700 truncate max-w-[160px]" title={name}>{name}</span> : null}
      <button
        className="text-sm px-2 py-1 rounded-md border hover:bg-slate-50"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        Sign out
      </button>
    </div>
  );
}
