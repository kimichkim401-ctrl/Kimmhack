import { NextRequest, NextResponse } from "next/server";
import { createOrRefreshVisitorSession } from "@/lib/services/session";
import { CSRF_COOKIE, getCookieValue, issueCsrfToken, SESSION_COOKIE, jsonError } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const existingSessionId = getCookieValue(request, SESSION_COOKIE);
    const session = await createOrRefreshVisitorSession(request, existingSessionId);
    const csrfToken = getCookieValue(request, CSRF_COOKIE) ?? crypto.randomUUID();
    const response = NextResponse.json({
      sessionId: session.id,
      network: {
        publicIp: session.ipAddress,
        protocol: session.protocol,
        approximateNetworkLocation: "UNAVAILABLE"
      },
      timestamp: session.createdAt.toISOString(),
      csrfToken
    });

    response.cookies.set(SESSION_COOKIE, session.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24
    });

    issueCsrfToken(response, csrfToken);

    return response;
  } catch (error) {
    console.error(error);
    return jsonError("CONNECTION TEMPORARILY UNAVAILABLE", 503);
  }
}
