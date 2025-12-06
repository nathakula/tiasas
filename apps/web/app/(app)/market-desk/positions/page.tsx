/**
 * Positions Page
 * View aggregated positions across all broker accounts
 */

import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db as prisma } from "@/lib/db";
import PositionsClient from "./positions_client";

export const metadata = {
  title: "Positions | Market Desk",
  description: "View and analyze positions across all broker accounts",
};

async function getOrgId(email: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: {
      user: { email },
    },
    orderBy: { createdAt: "asc" },
  });

  return membership?.orgId || null;
}

export default async function PositionsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/signin");
  }

  const orgId = await getOrgId(session.user.email);

  if (!orgId) {
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">
            No organization found. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Positions</h1>
        <p className="mt-2 text-gray-600 dark:text-slate-400">
          Aggregated view of all positions across your connected broker accounts. (v1.0.1)
        </p>
      </div>

      <Suspense fallback={<PositionsLoadingSkeleton />}>
        <PositionsClient orgId={orgId} />
      </Suspense>
    </div>
  );
}

function PositionsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
        <div className="h-8 w-64 rounded bg-gray-200" />
      </div>
      <div className="animate-pulse rounded-lg border border-gray-200 bg-white">
        <div className="h-64 w-full bg-gray-100" />
      </div>
    </div>
  );
}
