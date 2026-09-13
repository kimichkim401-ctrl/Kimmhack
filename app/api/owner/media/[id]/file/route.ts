import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/services/auth";
import { writeAuditLog } from "@/lib/services/audit";
import { resolveMediaRoot } from "@/lib/services/storage";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const owner = await requireOwner(request);
  const { id } = await params;
  const media = await prisma.media.findUnique({ where: { id } });

  if (!media || media.deletedAt) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  const root = resolveMediaRoot();
  const filePath = path.resolve(root, media.objectKey);
  if (!filePath.startsWith(root)) {
    return NextResponse.json({ error: "Invalid media object." }, { status: 400 });
  }

  const bytes = await readFile(filePath);
  await writeAuditLog({
    action: "OWNER_ACCESSED_MEDIA",
    actor: "OWNER",
    userId: owner.userId,
    sessionId: media.sessionId,
    metadata: { mediaId: media.id }
  });

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": media.mimeType,
      "Content-Length": String(media.byteSize),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
