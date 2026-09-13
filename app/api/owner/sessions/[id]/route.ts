import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/services/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOwner(request);
  const { id } = await params;
  const session = await prisma.visitorSession.findUnique({
    where: { id },
    include: {
      networkObservations: { orderBy: { createdAt: "desc" } },
      deviceCapabilities: { orderBy: { createdAt: "desc" }, take: 1 },
      telemetry: { orderBy: { createdAt: "desc" }, take: 1 },
      permissions: { orderBy: { createdAt: "desc" } },
      locationGrants: { orderBy: { grantedAt: "desc" } },
      media: { orderBy: { createdAt: "desc" } },
      mediaEvents: { orderBy: { createdAt: "desc" } },
      auditLogs: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({ session });
}
