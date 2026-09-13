import { NextRequest, NextResponse } from "next/server";
import { assertCsrf, jsonError } from "@/lib/security";
import { storePermissionEvent } from "@/lib/services/permissions";
import { permissionEventSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    assertCsrf(request);
    const parsed = permissionEventSchema.safeParse(await request.json());

    if (!parsed.success) {
      return jsonError("Invalid permission event.", 400);
    }

    await storePermissionEvent(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(error);
    return jsonError("Permission event could not be stored.", 500);
  }
}
