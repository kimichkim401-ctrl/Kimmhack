import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/services/auth";
import { assertSameOrigin } from "@/lib/security";
import { writeAuditLog } from "@/lib/services/audit";
import { deletePrivateMedia } from "@/lib/services/storage";
import { retentionSettingsSchema } from "@/lib/validators";

const keys = {
  sessionDays: "session_data_days",
  locationDays: "location_data_days",
  mediaDays: "media_days"
} as const;

export async function GET(request: NextRequest) {
  await requireOwner(request);
  const settings = await prisma.retentionSetting.findMany();
  const getDays = (key: string, fallback: number) => settings.find((setting) => setting.key === key)?.days ?? fallback;

  return NextResponse.json({
    retention: {
      sessionDays: getDays(keys.sessionDays, 30),
      locationDays: getDays(keys.locationDays, 30),
      mediaDays: getDays(keys.mediaDays, 7)
    }
  });
}

export async function POST(request: NextRequest) {
  assertSameOrigin(request);
  const owner = await requireOwner(request);
  const parsed = retentionSettingsSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid retention settings." }, { status: 400 });
  }

  await Promise.all(
    Object.entries(keys).map(([inputKey, dbKey]) =>
      prisma.retentionSetting.upsert({
        where: { key: dbKey },
        create: { key: dbKey, days: parsed.data[inputKey as keyof typeof keys] },
        update: { days: parsed.data[inputKey as keyof typeof keys] }
      })
    )
  );

  await writeAuditLog({
    action: "RETENTION_UPDATED",
    actor: "OWNER",
    userId: owner.userId,
    metadata: parsed.data
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  assertSameOrigin(request);
  const owner = await requireOwner(request);
  const media = await prisma.media.findMany({ where: { deletedAt: null } });

  await Promise.all(media.map((item) => deletePrivateMedia(item.objectKey)));
  await prisma.visitorSession.deleteMany();

  await writeAuditLog({
    action: "OWNER_DELETED_SESSION",
    actor: "OWNER",
    userId: owner.userId,
    metadata: { allVisitorDataDeleted: true }
  });

  return NextResponse.json({ ok: true });
}
