import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

export const OWNER_COOKIE = "kim_owner";
export const SESSION_COOKIE = "kim_session";
export const CSRF_COOKIE = "kim_csrf";

export function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfIp = request.headers.get("cf-connecting-ip");

  if (cfIp) return cfIp;
  if (realIp) return realIp;
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unavailable";

  return "unavailable";
}

export function getProtocol(request: NextRequest) {
  return request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
}

export function issueCsrfToken(response: NextResponse, token = nanoid(32)) {
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24
  });

  return token;
}

export function getCookieValue(request: NextRequest, name: string) {
  return request.cookies.get(name)?.value;
}

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  if (origin !== request.nextUrl.origin) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export function assertCsrf(request: NextRequest) {
  assertSameOrigin(request);
  const cookieToken = getCookieValue(request, CSRF_COOKIE);
  const headerToken = request.headers.get("x-kim-csrf");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new Response("Invalid CSRF token", { status: 403 });
  }
}

export function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  existing.count += 1;
  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt
  };
}
