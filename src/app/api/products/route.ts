import { jsonError, jsonSuccess } from "@/server/api/response";
import { applyRateLimit } from "@/server/api/rate-limit";
import { listProducts, upsertScrapedProduct } from "@/server/repositories/product-repository";
import { scraperIngestSchema } from "@/server/validation/product";
import { parseQueryIntent } from "@/lib/query-intent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    // --- INTENT PARSER ---
    // Parse natural language query (e.g. "hp gaming murah buat main genshin 3 jutaan")
    // menjadi structured filter. Explicit URL params selalu override hasil intent.
    const rawSearch = searchParams.get("search") ?? "";
    const intent = rawSearch ? parseQueryIntent(rawSearch) : null;

    const allowedUseCases = new Set(["gaming", "camera", "battery", "daily"]);
    const useCaseParam = searchParams.get("use_case");
    const useCase: "gaming" | "camera" | "battery" | "daily" | undefined =
      useCaseParam && allowedUseCases.has(useCaseParam)
        ? (useCaseParam as "gaming" | "camera" | "battery" | "daily")
        : intent?.useCase;

    const sortParam = searchParams.get("sort") ?? "terbaru";
    // Gunakan intent sort hanya jika sort masih default "terbaru" (user belum pilih sort manual)
    const sort =
      sortParam === "terbaru" && intent?.sort ? intent.sort : sortParam;

    const maxPriceParam = parseNumber(searchParams.get("max_price"));
    // Gunakan maxPrice dari intent hanya jika tidak ada explicit max_price di URL
    const maxPrice = maxPriceParam ?? intent?.maxPrice;

    // Jika intent terdeteksi, kirimkan remainingQuery ke FTS supaya kata filler tidak mengganggu.
    // Jika tidak ada intent, kirimkan rawSearch asli.
    const searchForFts =
      intent?.hasIntent
        ? intent.remainingQuery || undefined
        : rawSearch || undefined;

    const result = await listProducts({
      search: searchForFts,
      brandSlugs: brands,
      minPrice: parseNumber(searchParams.get("min_price")),
      maxPrice,
      hasNfc: searchParams.get("has_nfc") === "1" || (intent?.hasNfc ?? false),
      useCase,
      sort,
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
