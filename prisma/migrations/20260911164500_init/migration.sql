-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER');

-- CreateEnum
CREATE TYPE "TelemetryCategory" AS ENUM ('CLIENT', 'DEVICE', 'NETWORK', 'CAPABILITY');

-- CreateEnum
CREATE TYPE "TelemetrySource" AS ENUM ('AUTOMATIC', 'EXPLICIT_PERMISSION', 'OWNER');

-- CreateEnum
CREATE TYPE "PermissionKind" AS ENUM ('CAMERA', 'MICROPHONE', 'LOCATION');

-- CreateEnum
CREATE TYPE "PermissionState" AS ENUM ('LOCKED', 'PROMPT', 'GRANTED', 'DENIED', 'UNSUPPORTED');

-- CreateEnum
CREATE TYPE "ConsentState" AS ENUM ('EXPLICIT_SUBMISSION', 'DELETED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO');

-- CreateEnum
CREATE TYPE "AuditActor" AS ENUM ('VISITOR', 'OWNER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('SESSION_CREATED', 'TELEMETRY_RECEIVED', 'PERMISSION_GRANTED', 'PERMISSION_DENIED', 'LOCATION_RECEIVED', 'LOCATION_DELETED', 'RECORDING_STARTED', 'RECORDING_STOPPED', 'MEDIA_UPLOADED', 'MEDIA_DELETED', 'OWNER_LOGIN', 'OWNER_LOGOUT', 'OWNER_ACCESSED_MEDIA', 'OWNER_DELETED_SESSION', 'RETENTION_UPDATED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorSession" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "userAgent" TEXT,
    "referrer" TEXT,
    "page" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Telemetry" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "category" "TelemetryCategory" NOT NULL,
    "source" "TelemetrySource" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Telemetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkObservation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "timezone" TEXT,
    "isp" TEXT,
    "asn" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'request_headers',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NetworkObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceCapability" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "capability" "PermissionKind" NOT NULL,
    "state" "PermissionState" NOT NULL,
    "source" "TelemetrySource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationGrant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "altitude" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LocationGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "consentState" "ConsentState" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "mediaId" TEXT,
    "event" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "action" "AuditAction" NOT NULL,
    "actor" "AuditActor" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetentionSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "VisitorSession_createdAt_idx" ON "VisitorSession"("createdAt");

-- CreateIndex
CREATE INDEX "VisitorSession_lastSeenAt_idx" ON "VisitorSession"("lastSeenAt");

-- CreateIndex
CREATE INDEX "Telemetry_sessionId_idx" ON "Telemetry"("sessionId");

-- CreateIndex
CREATE INDEX "Telemetry_createdAt_idx" ON "Telemetry"("createdAt");

-- CreateIndex
CREATE INDEX "NetworkObservation_sessionId_idx" ON "NetworkObservation"("sessionId");

-- CreateIndex
CREATE INDEX "NetworkObservation_createdAt_idx" ON "NetworkObservation"("createdAt");

-- CreateIndex
CREATE INDEX "DeviceCapability_sessionId_idx" ON "DeviceCapability"("sessionId");

-- CreateIndex
CREATE INDEX "DeviceCapability_createdAt_idx" ON "DeviceCapability"("createdAt");

-- CreateIndex
CREATE INDEX "PermissionEvent_sessionId_idx" ON "PermissionEvent"("sessionId");

-- CreateIndex
CREATE INDEX "PermissionEvent_createdAt_idx" ON "PermissionEvent"("createdAt");

-- CreateIndex
CREATE INDEX "LocationGrant_sessionId_idx" ON "LocationGrant"("sessionId");

-- CreateIndex
CREATE INDEX "LocationGrant_grantedAt_idx" ON "LocationGrant"("grantedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Media_objectKey_key" ON "Media"("objectKey");

-- CreateIndex
CREATE INDEX "Media_sessionId_idx" ON "Media"("sessionId");

-- CreateIndex
CREATE INDEX "Media_createdAt_idx" ON "Media"("createdAt");

-- CreateIndex
CREATE INDEX "MediaEvent_sessionId_idx" ON "MediaEvent"("sessionId");

-- CreateIndex
CREATE INDEX "MediaEvent_createdAt_idx" ON "MediaEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_sessionId_idx" ON "AuditLog"("sessionId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionSetting_key_key" ON "RetentionSetting"("key");

-- AddForeignKey
ALTER TABLE "Telemetry" ADD CONSTRAINT "Telemetry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisitorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkObservation" ADD CONSTRAINT "NetworkObservation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisitorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceCapability" ADD CONSTRAINT "DeviceCapability_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisitorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionEvent" ADD CONSTRAINT "PermissionEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisitorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationGrant" ADD CONSTRAINT "LocationGrant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisitorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisitorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaEvent" ADD CONSTRAINT "MediaEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisitorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaEvent" ADD CONSTRAINT "MediaEvent_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisitorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

