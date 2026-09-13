import { NextRequest, NextResponse } from "next/server";
import { assertCsrf, getCookieValue, jsonError, SESSION_COOKIE } from "@/lib/security";
import { deleteLocationGrants, storeLocationGrant } from "@/lib/services/location";
import { locationSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    assertCsrf(request);
    const parsed = locationSchema.safeParse(await request.json());

    if (!parsed.success) {
      return jsonError("Invalid location payload.", 400);
    }

    const location = await storeLocationGrant(parsed.data);
    return NextResponse.json({
      id: location.id,
      status: "LOCATION PERMISSION GRANTED",
      timestamp: location.grantedAt.toISOString()
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(error);
    return jsonError("Location could not be stored.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    assertCsrf(request);
    const sessionId = getCookieValue(request, SESSION_COOKIE);

    if (!sessionId) {
      return jsonError("No session.", 400);
    }

    await deleteLocationGrants(sessionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(error);
    return jsonError("Location could not be deleted.", 500);
  }
}
