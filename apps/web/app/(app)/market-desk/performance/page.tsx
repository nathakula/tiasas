import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PerformanceClient } from "./performance_client";

export const metadata: Metadata = {
  title: "Performance Analysis | Tiasas",
  description: "Compare your trading performance against market benchmarks",
};

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  return <PerformanceClient />;
}
