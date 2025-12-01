/**
 * Connections Management Page
 * View and manage broker connections
 */

import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import ConnectionsClient from "./connections_client";

export const metadata = {
  title: "Connections | Market Desk",
  description: "Manage broker connections and sync positions",
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

export default async function ConnectionsPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Broker Connections</h1>
        <p className="mt-2 text-gray-600 dark:text-slate-400">
          Connect your brokerage accounts to aggregate and track positions across multiple brokers.
        </p>
      </div>

      <Suspense fallback={<ConnectionsLoadingSkeleton />}>
        <ConnectionsClient orgId={orgId} />
      </Suspense>
    </div>
  );
}

function ConnectionsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-gray-200 bg-white p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded bg-gray-200" />
              <div>
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-24 rounded bg-gray-200" />
              </div>
            </div>
            <div className="h-8 w-20 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
