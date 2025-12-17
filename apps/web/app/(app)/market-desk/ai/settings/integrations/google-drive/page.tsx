import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/api/route-helpers";
import { GoogleDriveSettings } from "@/components/ai/google-drive-settings";

export default async function GoogleDriveSettingsPage() {
  const auth = await requireAdmin();

  if ("error" in auth) {
    redirect("/market-desk/ai");
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Google Drive Integration
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Connect a Google Drive folder to surface research artifacts in the Analyst Bench.
        </p>
      </div>

      <GoogleDriveSettings />
    </div>
  );
}
