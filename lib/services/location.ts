import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";
import type { locationSchema } from "@/lib/validators";
import type { z } from "zod";

type LocationInput = z.infer<typeof locationSchema>;

export async function storeLocationGrant(input: LocationInput) {
  const location = await prisma.locationGrant.create({
    data: {
      sessionId: input.sessionId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      altitude: input.altitude ?? undefined,
      heading: input.heading ?? undefined,
      speed: input.speed ?? undefined
    }
  });

  await writeAuditLog({
    action: "LOCATION_RECEIVED",
    actor: "VISITOR",
    sessionId: input.sessionId,
    metadata: { accuracy: input.accuracy }
  });

  return location;
}

export async function deleteLocationGrants(sessionId: string) {
  await prisma.locationGrant.updateMany({
    where: { sessionId, deletedAt: null },
    data: { deletedAt: new Date() }
  });

  await writeAuditLog({
    action: "LOCATION_DELETED",
    actor: "VISITOR",
    sessionId
  });
}
