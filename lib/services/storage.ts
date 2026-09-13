import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { env } from "@/lib/env";
import { allowedMediaMimeTypes, maxMediaBytes } from "@/lib/validators";

export type StoredMedia = {
  objectKey: string;
  byteSize: number;
  mimeType: string;
};

export function resolveMediaRoot() {
  return path.resolve(process.cwd(), env.MEDIA_STORAGE_PATH);
}

export async function storePrivateMedia(file: File): Promise<StoredMedia> {
  if (!allowedMediaMimeTypes.has(file.type)) {
    throw new Error("Unsupported media type.");
  }

  if (file.size > maxMediaBytes) {
    throw new Error("Media file exceeds the configured size limit.");
  }

  const ext = file.type.includes("png")
    ? "png"
    : file.type.includes("jpeg")
      ? "jpg"
      : file.type.includes("webp")
        ? "webp"
        : file.type.includes("mp4")
          ? "mp4"
          : "webm";
  const objectKey = `${nanoid(32)}.${ext}`;
  const mediaRoot = resolveMediaRoot();
  const targetPath = path.join(mediaRoot, objectKey);

  await mkdir(mediaRoot, { recursive: true });
  await writeFile(targetPath, Buffer.from(await file.arrayBuffer()));

  return {
    objectKey,
    byteSize: file.size,
    mimeType: file.type
  };
}

export async function deletePrivateMedia(objectKey: string) {
  const mediaRoot = resolveMediaRoot();
  const targetPath = path.resolve(mediaRoot, objectKey);

  if (!targetPath.startsWith(mediaRoot)) {
    throw new Error("Invalid media object key.");
  }

  try {
    await stat(targetPath);
    await unlink(targetPath);
  } catch {
    return;
  }
}
