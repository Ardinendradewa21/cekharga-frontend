import { jsonError, jsonSuccess } from "@/server/api/response";
import { applyRateLimit } from "@/server/api/rate-limit";
import { listBrands } from "@/server/repositories/product-repository";

export async function GET(request: Request) {
  try {
    const rateLimit = applyRateLimit(request, "api-brands-list", {
      limit: 90,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return jsonError("Terlalu banyak request. Coba lagi beberapa saat.", 429);
    }

    const brands = await listBrands();
    return jsonSuccess(brands, "Data brand berhasil diambil.", {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return jsonError("Gagal mengambil data brand.", 500);
  }
}
