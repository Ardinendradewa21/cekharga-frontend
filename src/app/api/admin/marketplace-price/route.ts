import { z } from "zod";

import { jsonError, jsonSuccess } from "@/server/api/response";
import { requireAdminSession } from "@/server/auth/admin";
import { scrapeMarketplacePrice } from "@/server/scraper/marketplace";

export const runtime = "nodejs";

const requestSchema = z.object({
  url: z.string().trim().url(),
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
      return jsonError(parsed.error.issues[0]?.message ?? "URL marketplace tidak valid.", 400);
    }

    const scrapeResult = await scrapeMarketplacePrice(parsed.data.url);
    if (!scrapeResult.success || scrapeResult.price === null) {
      const statusCode =
        scrapeResult.source === "unknown" ||
        scrapeResult.error === "Failed to parse price automatically. Please input manually."
          ? 400
          : 500;

      return jsonError(
        scrapeResult.error ?? "Gagal mengambil harga dari marketplace.",
        statusCode,
        scrapeResult,
      );
    }

    return jsonSuccess(scrapeResult, "Harga marketplace berhasil diambil.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return jsonError(`Terjadi error saat scrape marketplace: ${message}`, 500);
  }
}
