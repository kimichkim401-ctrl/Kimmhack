import { AuditAction, AuditActor } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";
import type { telemetrySchema } from "@/lib/validators";
import type { z } from "zod";

type TelemetryInput = z.infer<typeof telemetrySchema>;

export async function storeTelemetry(input: TelemetryInput) {
  await prisma.telemetry.create({
    data: {
      sessionId: input.sessionId,
      category: "CLIENT",
      source: "AUTOMATIC",
      payload: input.payload
    }
  });

  await prisma.deviceCapability.create({
    data: {
      sessionId: input.sessionId,
      payload: input.payload
    }
  });

  await prisma.visitorSession.update({
    where: { id: input.sessionId },
    data: {
      lastSeenAt: new Date(),
      userAgent: input.payload.userAgent,
      updatedAt: new Date()
    }
  });

  await writeAuditLog({
    action: AuditAction.TELEMETRY_RECEIVED,
    actor: AuditActor.VISITOR,
    sessionId: input.sessionId,
    metadata: { fields: Object.keys(input.payload) }
  });
}
