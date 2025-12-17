import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/org";
import AIClient from "./ai-client";

export const metadata = {
  title: "Analyst's Bench (AI) | Market Desk",
  description: "AI-powered market analysis and portfolio insights",
};

export default async function AIPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/signin");
  }

  const orgId = await getActiveOrgId();

  return <AIClient key={orgId} />;
}
