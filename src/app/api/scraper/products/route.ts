import { jsonError, jsonSuccess } from "@/server/api/response";
import { upsertScrapedProduct } from "@/server/repositories/product-repository";
import { scraperIngestSchema } from "@/server/validation/product";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = scraperIngestSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Payload scraper tidak valid.", 400);
    }

    const product = await upsertScrapedProduct(parsed.data);
    return jsonSuccess(product, "Data scraping berhasil disimpan.");
  } catch {
    return jsonError("Gagal menyimpan data scraping.", 500);
  }
}
