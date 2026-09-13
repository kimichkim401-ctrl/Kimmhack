import { AuditAction, AuditActor, PermissionKind, PermissionState } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";

export async function storePermissionEvent(input: {
  sessionId: string;
  capability: PermissionKind;
  state: PermissionState;
}) {
  await prisma.permissionEvent.create({
    data: {
      sessionId: input.sessionId,
      capability: input.capability,
      state: input.state,
      source: "EXPLICIT_PERMISSION"
    }
  });

  if (input.state === "GRANTED" || input.state === "DENIED") {
    await writeAuditLog({
      action: input.state === "GRANTED" ? AuditAction.PERMISSION_GRANTED : AuditAction.PERMISSION_DENIED,
      actor: AuditActor.VISITOR,
      sessionId: input.sessionId,
      metadata: { capability: input.capability }
    });
  }
}
