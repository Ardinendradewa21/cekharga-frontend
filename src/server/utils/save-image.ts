import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const MAX_OUTPUT_SIZE = 3 * 1024 * 1024;
const MAX_DIMENSION = 1600;

/**
 * Resize, convert to WebP, and save a buffer to /public/uploads/<bucket>/.
 * Returns the relative path (e.g. "uploads/hp/filename.webp").
 * Throws if compression output exceeds MAX_OUTPUT_SIZE.
 */
export async function processAndSaveImage(buffer: Buffer, bucket: string): Promise<string> {
  const processed = await sharp(buffer, { failOn: "error", limitInputPixels: 64_000_000 })
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  if (processed.length > MAX_OUTPUT_SIZE) {
    throw new Error("Hasil kompresi gambar masih terlalu besar.");
  }

  const fileName = `${Date.now()}-${crypto.randomUUID()}.webp`;
  const relativePath = path.posix.join("uploads", bucket, fileName);
  const uploadDir = path.join(process.cwd(), "public", "uploads", bucket);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), processed);

  return relativePath;
}
