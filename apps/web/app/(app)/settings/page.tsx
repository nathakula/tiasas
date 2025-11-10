import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email } })
    : null;
  const memberships = user
    ? await prisma.membership.findMany({ where: { userId: user.id }, include: { org: true } })
    : [];
  return (
    <div className="space-y-6">
      <div className="card p-4">
        <div className="font-medium mb-1">Profile</div>
        <div className="text-sm text-slate-600">{user?.name ?? user?.email}</div>
      </div>
      <div className="card p-4">
        <div className="font-medium mb-2">Organizations</div>
        <ul className="text-sm">
          {memberships.map((m) => (
            <li key={m.id}>{m.org.name} — {m.role}</li>
          ))}
        </ul>
      </div>
      <div className="card p-4">
        <div className="font-medium mb-1">Connections</div>
        <div className="text-sm text-slate-600">Placeholder connections UI for v0.1</div>
      </div>
    </div>
  );
}

