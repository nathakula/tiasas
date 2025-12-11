/**
 * Onboarding Layout
 * Clean, centered layout for the onboarding wizard
 * No sidebar - just logo, progress indicator, and wizard content
 */

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Logo } from "@/components/logo";

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Require authentication but don't check onboarding status
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/signin");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gold-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header with Logo */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <Logo size="sm" withText />
        </div>
      </header>

      {/* Main Content - Centered Wizard */}
      <main className="container mx-auto px-6 py-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-3xl">
          {children}
        </div>
      </main>
    </div>
  );
}
