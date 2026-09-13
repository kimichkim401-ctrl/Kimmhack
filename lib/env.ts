import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  OWNER_EMAIL: z.string().email().optional(),
  OWNER_PASSWORD_HASH: z.string().optional(),
  MEDIA_STORAGE_PATH: z.string().default("./data/media"),
  SESSION_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  LOCATION_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  MEDIA_RETENTION_DAYS: z.coerce.number().int().positive().default(7),
  NODE_ENV: z.string().default("development")
});

export const env = envSchema.parse(process.env);

export function requireOwnerEnv() {
  if (!env.AUTH_SECRET || !env.OWNER_EMAIL || !env.OWNER_PASSWORD_HASH) {
    throw new Error("Owner authentication is not configured.");
  }

  return {
    authSecret: env.AUTH_SECRET,
    ownerEmail: env.OWNER_EMAIL,
    ownerPasswordHash: env.OWNER_PASSWORD_HASH
  };
}
