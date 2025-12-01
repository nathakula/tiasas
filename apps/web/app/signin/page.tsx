"use client";
import { signIn } from "next-auth/react";
import { Logo } from "@/components/logo";

export default function SignIn() {
  return (
    <main className="max-w-md mx-auto px-6 py-16">
      <div className="card p-8 text-center">
        <div className="flex justify-center mb-4">
          <Logo size="md" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Sign in</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">Use your Google account</p>
        <button
          className="inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-gold-600 hover:bg-gold-700 text-white transition-colors"
          onClick={() => signIn("google", { callbackUrl: "/market-desk" })}
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}
