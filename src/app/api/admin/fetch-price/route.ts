import { z } from "zod";

import { jsonError, jsonSuccess } from "@/server/api/response";
import { requireAdminSession } from "@/server/auth/admin";
import { fetchShopeeProductInfo } from "@/server/services/shopee-api";

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
      return jsonError(parsed.error.issues[0]?.message ?? "URL Shopee tidak valid.", 400);
    }

    const result = await fetchShopeeProductInfo(parsed.data.url);
    if (!result.success) {
      return jsonError(
        result.error ?? "Gagal mengambil data harga Shopee.",
        result.statusCode ?? 500,
        {
          price: result.price,
          name: result.name,
        },
      );
    }

    return jsonSuccess(result, "Data harga Shopee berhasil diambil.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return jsonError(`Terjadi error saat fetch harga Shopee: ${message}`, 500);
  }
}
