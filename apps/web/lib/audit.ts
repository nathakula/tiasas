import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function logAudit(params: {
  orgId: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  before?: any;
  after?: any;
}) {
  function toJson(val: any) {
    if (val === null || typeof val === "undefined") return Prisma.DbNull;
    try { return JSON.parse(JSON.stringify(val)); } catch { return val; }
  }
  const data = {
    orgId: params.orgId,
    userId: params.userId ?? null,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    before: toJson(params.before),
    after: toJson(params.after),
  } as const;
  await prisma.auditLog.create({ data: data as any });
}
