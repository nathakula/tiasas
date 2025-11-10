import { prisma } from "@/lib/db";

export async function logAudit(params: {
  orgId: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  before?: any;
  after?: any;
}) {
  await prisma.auditLog.create({ data: { ...params } as any });
}

