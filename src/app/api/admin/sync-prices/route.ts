import { jsonError, jsonSuccess } from "@/server/api/response";
import { requireAdminSession } from "@/server/auth/admin";
import { syncMarketplacePrices } from "@/server/services/price-sync";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session?.user) {
    return jsonError("Unauthorized admin.", 401);
  }

  try {
    const body = await request.json().catch(() => ({})) as { limit?: number };
    const limit = typeof body.limit === "number" && body.limit > 0 ? Math.min(body.limit, 200) : 100;

    const result = await syncMarketplacePrices(limit);

    if (result.total === 0) {
      return jsonSuccess(result, "Tidak ada harga yang perlu di-sync.");
    }

    return jsonSuccess(
      result,
      `Sync selesai: ${result.synced} berhasil, ${result.failed} gagal dari ${result.total} harga.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return jsonError(`Gagal menjalankan sync harga: ${message}`, 500);
  }
}
