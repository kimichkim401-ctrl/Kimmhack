import { z } from "zod";

export const telemetrySchema = z.object({
  sessionId: z.string().min(8),
  payload: z.object({
    userAgent: z.string().optional(),
    browser: z.string().optional(),
    platform: z.string().optional(),
    language: z.string().optional(),
    languages: z.array(z.string()).optional(),
    timezone: z.string().optional(),
    screen: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        colorDepth: z.number().int().optional()
      })
      .optional(),
    viewport: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive()
      })
      .optional(),
    devicePixelRatio: z.number().positive().optional(),
    hardwareConcurrency: z.number().int().positive().optional(),
    deviceMemory: z.number().positive().optional(),
    touchSupport: z.boolean().optional(),
    online: z.boolean().optional(),
    colorScheme: z.enum(["light", "dark", "not-supported"]).optional(),
    reducedMotion: z.enum(["reduce", "no-preference", "not-supported"]).optional(),
    connection: z
      .object({
        effectiveType: z.string().optional(),
        downlink: z.number().optional(),
        rtt: z.number().optional(),
        saveData: z.boolean().optional()
      })
      .optional(),
    capabilities: z.record(z.string(), z.boolean()).optional()
  })
});

export const permissionEventSchema = z.object({
  sessionId: z.string().min(8),
  capability: z.enum(["CAMERA", "MICROPHONE", "LOCATION"]),
  state: z.enum(["LOCKED", "PROMPT", "GRANTED", "DENIED", "UNSUPPORTED"])
});

export const locationSchema = z.object({
  sessionId: z.string().min(8),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative(),
  altitude: z.number().nullable().optional(),
  heading: z.number().nullable().optional(),
  speed: z.number().nullable().optional()
});

export const ownerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const mediaUploadMetadataSchema = z.object({
  sessionId: z.string().min(8),
  durationMs: z.coerce.number().int().nonnegative().optional(),
  mediaType: z.enum(["IMAGE", "VIDEO", "AUDIO"])
});

export const mediaEventSchema = z.object({
  sessionId: z.string().min(8),
  event: z.enum(["recording_started", "recording_stopped"]),
  payload: z.record(z.unknown()).optional()
});

export const retentionSettingsSchema = z.object({
  sessionDays: z.coerce.number().int().min(1).max(365),
  locationDays: z.coerce.number().int().min(1).max(365),
  mediaDays: z.coerce.number().int().min(1).max(365)
});

export const allowedMediaMimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "video/webm", "video/mp4", "audio/webm", "audio/mp4"]);

export const maxMediaBytes = 50 * 1024 * 1024;
