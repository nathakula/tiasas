import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/org";
import BulkUploadClient from "./bulk-upload-client";

export const metadata = {
  title: "Bulk Upload | Market Desk",
  description: "Upload historical data, journal entries, and P&L logs",
};

export default async function BulkUploadPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/signin");
  }

  const orgId = await getActiveOrgId();

  return <BulkUploadClient key={orgId} />;
}
