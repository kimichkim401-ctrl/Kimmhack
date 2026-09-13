import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/services/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await requireOwner(request);

  const since = new Date(Date.now() - 15 * 60 * 1000);
  const [
    totalSessions,
    activeSessions,
    permissionGrants,
    networkObservations,
    deviceProfiles,
    locationGrants,
    mediaCount,
    auditEvents,
    recentVisits,
    recentAudit
  ] = await Promise.all([
    prisma.visitorSession.count(),
    prisma.visitorSession.count({ where: { lastSeenAt: { gte: since } } }),
    prisma.permissionEvent.count({ where: { state: "GRANTED" } }),
    prisma.networkObservation.count(),
    prisma.deviceCapability.count(),
    prisma.locationGrant.count({ where: { deletedAt: null } }),
    prisma.media.count({ where: { deletedAt: null } }),
    prisma.auditLog.count(),
    prisma.visitorSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        networkObservations: { orderBy: { createdAt: "desc" }, take: 1 },
        permissions: { orderBy: { createdAt: "desc" }, take: 8 },
        telemetry: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 })
  ]);

  return NextResponse.json({
    overview: {
      totalSessions,
      activeSessions,
      permissionGrants,
      networkObservations,
      deviceProfiles,
      locationGrants,
      mediaCount,
      auditEvents
    },
    recentVisits,
    recentAudit
  });
}
