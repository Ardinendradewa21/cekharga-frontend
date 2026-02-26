import { z } from "zod";

import { jsonError, jsonSuccess } from "@/server/api/response";
import { requireAdminSession } from "@/server/auth/admin";
import { upsertProductPriceByTitle } from "@/server/repositories/product-repository";

export const runtime = "nodejs";

const requestSchema = z.object({
  product_slug: z.string().trim().min(1),
  title: z.string().trim().min(1),
  price: z.number().positive(),
  affiliate_url: z.string().trim().url(),
  seller_name: z.string().trim().max(255).optional().nullable(),
  marketplace_id: z.number().int().positive().optional().nullable(),
  marketplace_slug: z.string().trim().max(255).optional().nullable(),
  payload: z.unknown().optional(),
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
      return jsonError(parsed.error.issues[0]?.message ?? "Payload sinkronisasi tidak valid.", 400);
    }

    const result = await upsertProductPriceByTitle({
      productSlug: parsed.data.product_slug,
      title: parsed.data.title,
      price: parsed.data.price,
      affiliateUrl: parsed.data.affiliate_url,
      sellerName: parsed.data.seller_name ?? null,
      marketplaceId: parsed.data.marketplace_id ?? null,
      marketplaceSlug: parsed.data.marketplace_slug ?? null,
      payload: parsed.data.payload,
    });

    if (!result.success) {
      return jsonError(result.message, 400, result);
    }

    if (!result.mapped) {
      return jsonSuccess(result, result.message, { status: 202 });
    }

    return jsonSuccess(result, result.message);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return jsonError(`Gagal sinkronisasi harga varian: ${message}`, 500);
  }
}
