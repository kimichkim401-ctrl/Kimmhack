import { NextRequest, NextResponse } from "next/server";
import { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertCsrf, jsonError } from "@/lib/security";
import { writeAuditLog } from "@/lib/services/audit";
import { mediaEventSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    assertCsrf(request);
    const parsed = mediaEventSchema.safeParse(await request.json());

    if (!parsed.success) {
      return jsonError("Invalid media event.", 400);
    }

    await prisma.mediaEvent.create({
      data: {
        sessionId: parsed.data.sessionId,
        event: parsed.data.event,
        payload: parsed.data.payload as Prisma.InputJsonValue | undefined
      }
    });

    await writeAuditLog({
      action: parsed.data.event === "recording_started" ? AuditAction.RECORDING_STARTED : AuditAction.RECORDING_STOPPED,
      actor: "VISITOR",
      sessionId: parsed.data.sessionId
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(error);
    return jsonError("Media event could not be stored.", 500);
  }
}
