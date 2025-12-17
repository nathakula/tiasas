import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/org";
import SettingsClient from "./settings-client";

export const metadata = {
    title: "Settings | Market Desk",
    description: "Configure AI providers and preferences",
};

export default async function SettingsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/signin");
    }

    const orgId = await getActiveOrgId();

    return <SettingsClient key={orgId} />;
}
