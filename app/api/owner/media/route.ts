import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/services/auth";
import { writeAuditLog } from "@/lib/services/audit";
import { deletePrivateMedia } from "@/lib/services/storage";
import { assertSameOrigin } from "@/lib/security";

export async function GET(request: NextRequest) {
  const owner = await requireOwner(request);
  const media = await prisma.media.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      sessionId: true,
      mediaType: true,
      mimeType: true,
      byteSize: true,
      durationMs: true,
      consentState: true,
      createdAt: true
    }
  });

  await writeAuditLog({
    action: "OWNER_ACCESSED_MEDIA",
    actor: "OWNER",
    userId: owner.userId,
    metadata: { count: media.length }
  });

  return NextResponse.json({ media });
}

export async function DELETE(request: NextRequest) {
  assertSameOrigin(request);
  const owner = await requireOwner(request);
  const mediaId = request.nextUrl.searchParams.get("mediaId");

  if (!mediaId) {
    return NextResponse.json({ error: "Missing mediaId." }, { status: 400 });
  }

  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  await deletePrivateMedia(media.objectKey);
  await prisma.media.update({
    where: { id: mediaId },
    data: { deletedAt: new Date(), consentState: "DELETED" }
  });

  await writeAuditLog({
    action: "MEDIA_DELETED",
    actor: "OWNER",
    userId: owner.userId,
    sessionId: media.sessionId,
    metadata: { mediaId }
  });

  return NextResponse.json({ ok: true });
}
