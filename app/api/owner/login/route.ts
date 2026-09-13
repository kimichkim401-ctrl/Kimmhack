import { NextRequest, NextResponse } from "next/server";
import { createOwnerToken, setOwnerCookie, verifyOwnerCredentials } from "@/lib/services/auth";
import { assertSameOrigin, getRequestIp, jsonError, rateLimit } from "@/lib/security";
import { ownerLoginSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const key = `owner-login:${getRequestIp(request)}`;
    const limited = rateLimit(key, 5, 15 * 60 * 1000);

    if (!limited.allowed) {
      return jsonError("Authentication temporarily throttled.", 429);
    }

    const parsed = ownerLoginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Invalid credentials.", 400);
    }

    const session = await verifyOwnerCredentials(parsed.data.email, parsed.data.password);
    if (!session) {
      return jsonError("Invalid credentials.", 401);
    }

    const token = await createOwnerToken(session);
    const response = NextResponse.json({ ok: true });
    setOwnerCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(error);
    return jsonError("Owner authentication is not configured.", 500);
  }
}
