import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { jsonError, jsonSuccess } from "@/server/api/response";
import { requireAdminSession } from "@/server/auth/admin";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_OUTPUT_SIZE = 3 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const ALLOWED_TYPES = new Set(["jpeg", "png", "webp"]);
const ALLOWED_BUCKETS = new Set(["hp", "brands", "marketplaces"]);

function sniffImageType(buffer: Buffer): "jpeg" | "png" | "webp" | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  // WEBP: RIFF....WEBP
  const riff = buffer.toString("ascii", 0, 4);
  const webp = buffer.toString("ascii", 8, 12);
  if (riff === "RIFF" && webp === "WEBP") {
    return "webp";
  }

  return null;
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session?.user) {
    return jsonError("Unauthorized admin.", 401);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const rawBucket = formData.get("bucket");
    const bucket = typeof rawBucket === "string" && ALLOWED_BUCKETS.has(rawBucket) ? rawBucket : "hp";

    if (!(file instanceof File)) {
      return jsonError("File gambar tidak ditemukan.", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonError("Ukuran gambar maksimal 5MB.", 400);
    }

    const bytes = await file.arrayBuffer();
    const originalBuffer = Buffer.from(bytes);
    const sniffedType = sniffImageType(originalBuffer);

    if (!sniffedType || !ALLOWED_TYPES.has(sniffedType)) {
      return jsonError("Format gambar harus JPEG/PNG/WEBP valid.", 400);
    }

    const image = sharp(originalBuffer, {
      failOn: "error",
      limitInputPixels: 64_000_000,
    }).rotate();

    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) {
      return jsonError("Gagal membaca dimensi gambar.", 400);
    }

    const processed = await image
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: 82,
        effort: 4,
      })
      .toBuffer();

    if (processed.length > MAX_OUTPUT_SIZE) {
      return jsonError("Hasil kompresi gambar masih terlalu besar (maks 3MB).", 400);
    }

    const fileName = `${Date.now()}-${crypto.randomUUID()}.webp`;
    const relativePath = path.posix.join("uploads", bucket, fileName);
    const uploadDir = path.join(process.cwd(), "public", "uploads", bucket);
    const outputPath = path.join(uploadDir, fileName);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(outputPath, processed);

    const origin = new URL(request.url).origin;
    return jsonSuccess(
      {
        path: relativePath,
        url: `${origin}/${relativePath}`,
      },
      "Gambar berhasil diupload.",
    );
  } catch {
    return jsonError("Gagal mengupload gambar.", 500);
  }
}
