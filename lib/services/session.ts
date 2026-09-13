import { nanoid } from "nanoid";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getProtocol, getRequestIp } from "@/lib/security";
import { writeAuditLog } from "@/lib/services/audit";

export async function createOrRefreshVisitorSession(request: NextRequest, existingSessionId?: string) {
  const sessionId = existingSessionId ?? `kim_${nanoid(24)}`;
  const ipAddress = getRequestIp(request);
  const protocol = getProtocol(request).toUpperCase();
  const userAgent = request.headers.get("user-agent");
  const referrer = request.headers.get("referer");
  const page = request.nextUrl.pathname;

  const session = await prisma.visitorSession.upsert({
    where: { id: sessionId },
    create: {
      id: sessionId,
      ipAddress,
      protocol,
      userAgent,
      referrer,
      page
    },
    update: {
      lastSeenAt: new Date(),
      userAgent,
      referrer,
      page
    }
  });

  if (!existingSessionId) {
    await writeAuditLog({
      action: "SESSION_CREATED",
      actor: "VISITOR",
      sessionId,
      metadata: { protocol, ipAvailable: ipAddress !== "unavailable" }
    });
  }

  await prisma.networkObservation.create({
    data: {
      sessionId,
      source: "request_headers",
      timezone: request.headers.get("cf-timezone") ?? undefined,
      country: request.headers.get("cf-ipcountry") ?? undefined
    }
  });

  return session;
}

export async function deleteVisitorSession(sessionId: string) {
  await prisma.visitorSession.delete({ where: { id: sessionId } });
  await writeAuditLog({
    action: "OWNER_DELETED_SESSION",
    actor: "OWNER",
    metadata: { deletedSessionId: sessionId }
  });
}
