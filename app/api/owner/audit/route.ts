import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/services/auth";

export async function GET(request: NextRequest) {
  await requireOwner(request);
  const audit = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({ audit });
}
