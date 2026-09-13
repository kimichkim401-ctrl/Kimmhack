import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/services/auth";
import { writeAuditLog } from "@/lib/services/audit";
import { assertSameOrigin } from "@/lib/security";

export async function GET(request: NextRequest) {
  await requireOwner(request);
  const locations = await prisma.locationGrant.findMany({
    where: { deletedAt: null },
    orderBy: { grantedAt: "desc" },
    take: 100,
    include: {
      session: {
        select: {
          ipAddress: true,
          protocol: true,
          createdAt: true
        }
      }
    }
  });

  return NextResponse.json({ locations });
}

export async function DELETE(request: NextRequest) {
  assertSameOrigin(request);
  const owner = await requireOwner(request);
  const locationId = request.nextUrl.searchParams.get("locationId");

  if (!locationId) {
    return NextResponse.json({ error: "Missing locationId." }, { status: 400 });
  }

  const location = await prisma.locationGrant.update({
    where: { id: locationId },
    data: { deletedAt: new Date() }
  });

  await writeAuditLog({
    action: "LOCATION_DELETED",
    actor: "OWNER",
    userId: owner.userId,
    sessionId: location.sessionId,
    metadata: { locationId }
  });

  return NextResponse.json({ ok: true });
}
