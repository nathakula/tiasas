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
        <div className="font-medium mb-3">Profile</div>
        <div className="flex items-center gap-4">
          {user?.image ? (
            // Use img to avoid remote image domain config requirements
            <img
              src={user.image}
              alt={user?.name ?? "Avatar"}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full border object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-12 h-12 rounded-full border bg-slate-100 flex items-center justify-center text-slate-500">
              {(user?.name ?? user?.email ?? "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-base font-medium">{user?.name ?? "—"}</div>
            <div className="text-sm text-slate-600">{user?.email ?? "—"}</div>
          </div>
        </div>
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
