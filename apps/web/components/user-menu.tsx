"use client";
import { signOut } from "next-auth/react";

export function UserMenu({ name }: { name?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      {name ? <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-[160px]" title={name}>{name}</span> : null}
      <button
        className="text-sm px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        Sign out
      </button>
    </div>
  );
}
