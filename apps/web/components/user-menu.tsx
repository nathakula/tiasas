"use client";
import { signOut } from "next-auth/react";

export function UserMenu({ name }: { name?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      {name ? <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-[160px]" title={name}>{name}</span> : null}
      <button
        className="text-sm px-3 py-2 rounded-md bg-gold-600 hover:bg-gold-700 text-white font-medium transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        Sign out
      </button>
    </div>
  );
}
