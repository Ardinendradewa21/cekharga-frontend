import { z } from "zod";

import { jsonError, jsonSuccess } from "@/server/api/response";
import { requireAdminSession } from "@/server/auth/admin";
import { processAndSaveImage } from "@/server/utils/save-image";

export const runtime = "nodejs";

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const requestSchema = z.object({
  imageUrl: z.string().trim().url(),
  bucket: z.enum(["hp", "brands", "marketplaces"]).default("hp"),
});

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session?.user) {
    return jsonError("Unauthorized admin.", 401);
  }

  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Parameter tidak valid.", 400);
    }

    const { imageUrl, bucket } = parsed.data;

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://www.gsmarena.com/",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return jsonError(`Gagal mengambil gambar dari URL (status ${response.status}).`, 400);
    }

    const contentType = response.headers.get("content-type") ?? "";
    const baseContentType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!ALLOWED_CONTENT_TYPES.has(baseContentType)) {
      return jsonError(`Tipe konten tidak didukung: ${baseContentType || "unknown"}.`, 400);
    }

    const arrayBuffer = await response.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    if (originalBuffer.length > 10 * 1024 * 1024) {
      return jsonError("Gambar dari URL terlalu besar (maks 10MB).", 400);
    }

    const relativePath = await processAndSaveImage(originalBuffer, bucket);

    const origin = new URL(request.url).origin;
    return jsonSuccess(
      { path: relativePath, url: `${origin}/${relativePath}` },
      "Gambar berhasil diambil dan disimpan.",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return jsonError(`Gagal mengambil gambar dari URL: ${message}`, 500);
  }
}
