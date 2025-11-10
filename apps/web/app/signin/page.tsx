"use client";
import { signIn } from "next-auth/react";

export default function SignIn() {
  return (
    <main className="max-w-md mx-auto px-6 py-16">
      <div className="card p-8 text-center">
        <h1 className="text-2xl font-semibold mb-2">Sign in</h1>
        <p className="text-slate-600 mb-6">Use your Google account</p>
        <button
          className="inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-black text-white hover:opacity-90"
          onClick={() => signIn("google", { callbackUrl: "/app/market-desk" })}
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}
