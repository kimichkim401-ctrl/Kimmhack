import { NextRequest, NextResponse } from "next/server";
import { assertCsrf, jsonError } from "@/lib/security";
import { storeTelemetry } from "@/lib/services/telemetry";
import { telemetrySchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    assertCsrf(request);
    const parsed = telemetrySchema.safeParse(await request.json());

    if (!parsed.success) {
      return jsonError("Invalid telemetry payload.", 400);
    }

    await storeTelemetry(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(error);
    return jsonError("Telemetry could not be stored.", 500);
  }
}
