import { NextRequest, NextResponse } from "next/server";
import { clearOwnerCookie, requireOwner } from "@/lib/services/auth";
import { writeAuditLog } from "@/lib/services/audit";
import { assertSameOrigin } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const owner = await requireOwner(request);
    await writeAuditLog({ action: "OWNER_LOGOUT", actor: "OWNER", userId: owner.userId });
  } catch {
    // Logout should still clear a stale cookie.
  }

  const response = NextResponse.json({ ok: true });
  clearOwnerCookie(response);
  return response;
}
