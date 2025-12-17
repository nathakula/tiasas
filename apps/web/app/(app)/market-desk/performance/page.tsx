import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PerformanceClient } from "./performance_client";
import { getActiveOrgId } from "@/lib/org";
import { getMonthlyPnl } from "@/lib/performance";

export const metadata: Metadata = {
  title: "Performance Analysis | Tiasas",
  description: "Compare your trading performance against market benchmarks",
};

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  // Fetch initial data for the current year server-side
  const currentYear = new Date().getFullYear();
  const initialMonthlyData = await getMonthlyPnl(orgId, currentYear);

  return <PerformanceClient key={orgId} initialMonthlyData={initialMonthlyData} orgId={orgId} />;
}
