import { jsonError, jsonSuccess } from "@/server/api/response";
import { applyRateLimit } from "@/server/api/rate-limit";
import { listProducts, upsertScrapedProduct } from "@/server/repositories/product-repository";
import { scraperIngestSchema } from "@/server/validation/product";

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
  try {
    const rateLimit = applyRateLimit(request, "api-products-list", {
      limit: 120,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return jsonError("Terlalu banyak request. Coba lagi beberapa saat.", 429);
    }

    const { searchParams } = new URL(request.url);
    const brandQuery = searchParams.get("brands") ?? "";
    const brands = brandQuery
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const useCaseValue = searchParams.get("use_case");
    const allowedUseCases = new Set(["gaming", "camera", "battery", "daily"]);
    const useCase =
      useCaseValue && allowedUseCases.has(useCaseValue)
        ? (useCaseValue as "gaming" | "camera" | "battery" | "daily")
        : undefined;

    const result = await listProducts({
      search: searchParams.get("search") ?? undefined,
      brandSlugs: brands,
      minPrice: parseNumber(searchParams.get("min_price")),
      maxPrice: parseNumber(searchParams.get("max_price")),
      hasNfc: searchParams.get("has_nfc") === "1",
      useCase,
      sort: searchParams.get("sort") ?? "terbaru",
      page: parseNumber(searchParams.get("page")) ?? 1,
      limit: 12,
    });

    return jsonSuccess(
      result.data,
      "Data produk berhasil diambil.",
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      },
      {
        meta: {
          current_page: result.currentPage,
          last_page: result.lastPage,
          total: result.total,
        },
      },
    );
  } catch {
    return jsonError("Gagal mengambil data produk.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = scraperIngestSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Payload scraper tidak valid.", 400);
    }

    const product = await upsertScrapedProduct(parsed.data);
    return jsonSuccess(product, "Data scraper berhasil diproses.");
  } catch {
    return jsonError("Gagal memproses data scraper.", 500);
  }
}
