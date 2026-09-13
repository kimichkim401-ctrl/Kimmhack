import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/services/auth";
import { deleteVisitorSession } from "@/lib/services/session";
import { assertSameOrigin } from "@/lib/security";

export async function GET(request: NextRequest) {
  await requireOwner(request);

  const sessions = await prisma.visitorSession.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      networkObservations: { orderBy: { createdAt: "desc" }, take: 1 },
      locationGrants: { where: { deletedAt: null }, orderBy: { grantedAt: "desc" }, take: 1 },
      media: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 5 },
      permissions: { orderBy: { createdAt: "desc" }, take: 10 },
      telemetry: { orderBy: { createdAt: "desc" }, take: 1 }
    }
  });

  return NextResponse.json({ sessions });
}

export async function DELETE(request: NextRequest) {
  assertSameOrigin(request);
  await requireOwner(request);
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
  }

  await deleteVisitorSession(sessionId);
  return NextResponse.json({ ok: true });
}
