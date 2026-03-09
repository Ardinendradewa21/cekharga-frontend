import { jsonError, jsonSuccess } from "@/server/api/response";
import { syncMarketplacePrices } from "@/server/services/price-sync";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return jsonError("CRON_SECRET tidak dikonfigurasi di environment.", 500);
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return jsonError("Unauthorized.", 401);
  }

  try {
    const result = await syncMarketplacePrices(200);

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
