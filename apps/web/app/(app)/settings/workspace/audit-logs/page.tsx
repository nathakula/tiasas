import { db as prisma } from "@/lib/db";
import { requireAdmin } from "@/app/api/route-helpers";
import { redirect } from "next/navigation";
import { AuditLogTable } from "@/components/workspace/audit-log-table";

export default async function AuditLogsPage() {
  // Require ADMIN+ access
  const auth = await requireAdmin();

  if ("error" in auth) {
    redirect("/settings/workspace");
  }

  const { orgId } = auth;

  // Fetch recent audit logs (last 100 entries)
  const logs = await prisma.auditLog.findMany({
    where: { orgId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: { at: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
        <p className="text-muted-foreground">
          View activity history for your workspace
        </p>
      </div>

      <AuditLogTable logs={logs} />
    </div>
  );
}
