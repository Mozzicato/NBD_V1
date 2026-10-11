import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { del, get, put } from "@vercel/blob";
import { config } from "./config";

// Development files stay local; deployed files are private Vercel Blobs.
const ROOT = path.join(process.cwd(), "storage");

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export class UploadError extends Error {}

export async function savePrivateFile(folder: "ids" | "evidence" | "avatars", file: File) {
  const ext = ALLOWED[file.type];
  if (!ext) throw new UploadError("Upload a JPG, PNG, WEBP or PDF file.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("File must be 4MB or smaller.");
  const key = `${folder}/${randomUUID()}.${ext}`;
  if (config.blobReadWriteToken) {
    const blob = await put(key, file, { access: "private", addRandomSuffix: false, contentType: file.type, token: config.blobReadWriteToken });
    return blob.pathname;
  }
  if (config.isProd) throw new UploadError("File uploads are not configured.");
  await mkdir(path.join(ROOT, folder), { recursive: true });
  await writeFile(path.join(ROOT, key), Buffer.from(await file.arrayBuffer()));
  return key;
}

function resolveKey(key: string) {
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Invalid storage key");
  return full;
}

export async function readPrivateFile(key: string) {
  if (config.blobReadWriteToken) {
    const blob = await get(key, { access: "private", token: config.blobReadWriteToken });
    if (!blob || blob.statusCode !== 200 || !blob.stream) throw new Error("File not found");
    return { data: blob.stream, type: blob.blob.contentType };
  }
  const ext = key.split(".").pop() ?? "";
  const type = Object.entries(ALLOWED).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
  return { data: await readFile(resolveKey(key)), type };
}

export async function deletePrivateFile(key: string) {
  if (config.blobReadWriteToken) {
    try {
      await del(key, { token: config.blobReadWriteToken });
    } catch {
      // already gone
    }
    return;
  }
  try {
    await unlink(resolveKey(key));
  } catch {
    // already gone
  }
}
