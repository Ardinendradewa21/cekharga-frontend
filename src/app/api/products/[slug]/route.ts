import { jsonError, jsonSuccess } from "@/server/api/response";
import { applyRateLimit } from "@/server/api/rate-limit";
import { getProductBySlug } from "@/server/repositories/product-repository";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const rateLimit = applyRateLimit(_request, "api-products-detail", {
      limit: 180,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return jsonError("Terlalu banyak request. Coba lagi beberapa saat.", 429);
    }

    const { slug } = await context.params;
    const product = await getProductBySlug(slug);

    if (!product) {
      return jsonError("Produk tidak ditemukan.", 404);
    }

    return jsonSuccess(product, "Detail produk berhasil diambil.", {
      headers: {
        "Cache-Control": "public, max-age=120, stale-while-revalidate=600",
      },
    });
  } catch {
    return jsonError("Gagal mengambil detail produk.", 500);
  }
}
