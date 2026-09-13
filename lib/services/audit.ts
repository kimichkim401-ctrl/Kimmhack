import { AuditAction, AuditActor, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function writeAuditLog(input: {
  action: AuditAction;
  actor: AuditActor;
  sessionId?: string;
  userId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        actor: input.actor,
        sessionId: input.sessionId,
        userId: input.userId,
        metadata: input.metadata
      }
    });
  } catch (error) {
    console.error("Audit log failed", error);
  }
}
