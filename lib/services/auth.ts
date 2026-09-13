import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env, requireOwnerEnv } from "@/lib/env";
import { prisma } from "@/lib/db";
import { OWNER_COOKIE } from "@/lib/security";
import { writeAuditLog } from "@/lib/services/audit";

type OwnerSession = {
  userId: string;
  email: string;
  role: "OWNER";
};

function secretKey() {
  const { authSecret } = requireOwnerEnv();
  return new TextEncoder().encode(authSecret);
}

export async function verifyOwnerCredentials(email: string, password: string) {
  const { ownerEmail, ownerPasswordHash } = requireOwnerEnv();

  if (email.toLowerCase() !== ownerEmail.toLowerCase()) {
    return null;
  }

  const valid = await bcrypt.compare(password, ownerPasswordHash);
  if (!valid) return null;

  const user = await prisma.user.upsert({
    where: { email: ownerEmail.toLowerCase() },
    create: { email: ownerEmail.toLowerCase(), role: "OWNER" },
    update: {}
  });

  await writeAuditLog({
    action: "OWNER_LOGIN",
    actor: "OWNER",
    userId: user.id
  });

  return { userId: user.id, email: user.email, role: "OWNER" as const };
}

export async function createOwnerToken(session: OwnerSession) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .setSubject(session.userId)
    .sign(secretKey());
}

export async function readOwnerToken(token?: string): Promise<OwnerSession | null> {
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, secretKey());
    const payload = verified.payload as Partial<OwnerSession>;

    if (!payload.userId || payload.role !== "OWNER" || !payload.email) {
      return null;
    }

    return { userId: payload.userId, email: payload.email, role: "OWNER" };
  } catch {
    return null;
  }
}

export async function getOwnerSession() {
  const cookieStore = await cookies();
  return readOwnerToken(cookieStore.get(OWNER_COOKIE)?.value);
}

export async function requireOwner(request: NextRequest) {
  const session = await readOwnerToken(request.cookies.get(OWNER_COOKIE)?.value);

  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return session;
}

export function setOwnerCookie(response: NextResponse, token: string) {
  response.cookies.set(OWNER_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8
  });
}

export function clearOwnerCookie(response: NextResponse) {
  response.cookies.set(OWNER_COOKIE, "", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}
