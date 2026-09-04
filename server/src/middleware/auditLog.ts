import type { Prisma, PrismaClient } from '@prisma/client';
import type { Request } from 'express';

type Db = PrismaClient | Prisma.TransactionClient;

export interface AuditLogInput {
  actorId?: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  metadata?: Record<string, unknown>;
  req?: Request;
}

/** Fire-and-forget-safe audit log write. Pass a `tx` client to include it in an ongoing transaction. */
export async function logActivity(db: Db, input: AuditLogInput): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
      ipAddress: input.req?.ip,
    },
  });
}
