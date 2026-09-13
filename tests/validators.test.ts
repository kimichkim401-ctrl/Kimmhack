import { describe, expect, it } from "vitest";
import { locationSchema, mediaUploadMetadataSchema, ownerLoginSchema, retentionSettingsSchema, telemetrySchema } from "@/lib/validators";

describe("KIM API validators", () => {
  it("accepts a truthful browser telemetry payload", () => {
    const parsed = telemetrySchema.safeParse({
      sessionId: "kim_test_session",
      payload: {
        browser: "Chrome",
        platform: "Win32",
        screen: { width: 1920, height: 1080 },
        viewport: { width: 1440, height: 900 },
        capabilities: { camera: true, webgpu: false }
      }
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects impossible precise location coordinates", () => {
    const parsed = locationSchema.safeParse({
      sessionId: "kim_test_session",
      latitude: 140,
      longitude: 8,
      accuracy: 10
    });

    expect(parsed.success).toBe(false);
  });

  it("requires bounded retention windows", () => {
    expect(retentionSettingsSchema.safeParse({ sessionDays: 30, locationDays: 30, mediaDays: 7 }).success).toBe(true);
    expect(retentionSettingsSchema.safeParse({ sessionDays: 0, locationDays: 30, mediaDays: 7 }).success).toBe(false);
  });

  it("validates owner login and media metadata", () => {
    expect(ownerLoginSchema.safeParse({ email: "owner@example.com", password: "strong-password" }).success).toBe(true);
    expect(mediaUploadMetadataSchema.safeParse({ sessionId: "kim_test_session", durationMs: "1000", mediaType: "VIDEO" }).success).toBe(true);
  });
});
