import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertCsrf, jsonError } from "@/lib/security";
import { writeAuditLog } from "@/lib/services/audit";
import { storePrivateMedia } from "@/lib/services/storage";
import { mediaUploadMetadataSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    assertCsrf(request);
    const formData = await request.formData();
    const file = formData.get("file");
    const metadata = mediaUploadMetadataSchema.safeParse({
      sessionId: formData.get("sessionId"),
      durationMs: formData.get("durationMs") ?? undefined,
      mediaType: formData.get("mediaType") ?? "VIDEO"
    });

    if (!(file instanceof File)) {
      return jsonError("Missing media file.", 400);
    }

    if (!metadata.success) {
      return jsonError("Invalid media metadata.", 400);
    }

    const stored = await storePrivateMedia(file);
    const media = await prisma.media.create({
      data: {
        sessionId: metadata.data.sessionId,
        objectKey: stored.objectKey,
        mediaType: metadata.data.mediaType,
        mimeType: stored.mimeType,
        byteSize: stored.byteSize,
        durationMs: metadata.data.durationMs,
        consentState: "EXPLICIT_SUBMISSION"
      }
    });

    await prisma.mediaEvent.create({
      data: {
        sessionId: metadata.data.sessionId,
        mediaId: media.id,
        event: "uploaded",
        payload: { mimeType: stored.mimeType, byteSize: stored.byteSize }
      }
    });

    await writeAuditLog({
      action: "MEDIA_UPLOADED",
      actor: "VISITOR",
      sessionId: metadata.data.sessionId,
      metadata: { mediaId: media.id, byteSize: stored.byteSize }
    });

    return NextResponse.json({
      ok: true,
      mediaId: media.id,
      status: "SENT TO KIM VAULT"
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(error);
    return jsonError(error instanceof Error ? error.message : "Media upload failed.", 400);
  }
}
