import { scrapeMarketplacePrice } from "@/server/scraper/marketplace";
import { prisma } from "@/lib/prisma";

const BATCH_SIZE = 5;
const DELAY_MS = 800;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type PriceSyncResult = {
  synced: number;
  failed: number;
  total: number;
};

export async function syncMarketplacePrices(limit: number): Promise<PriceSyncResult> {
  const priceRows = await prisma.marketplacePrice.findMany({
    where: { is_active: true, affiliate_url: { not: "" } },
    select: { id: true, affiliate_url: true },
    orderBy: { last_synced_at: "asc" },
    take: limit,
  });

  if (priceRows.length === 0) {
    return { synced: 0, failed: 0, total: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (let i = 0; i < priceRows.length; i += BATCH_SIZE) {
    const batch = priceRows.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (row) => {
        try {
          const result = await scrapeMarketplacePrice(row.affiliate_url);
          if (result.success && result.price !== null) {
            await prisma.marketplacePrice.update({
              where: { id: row.id },
              data: { price: result.price, last_synced_at: new Date(), updated_at: new Date() },
            });
            synced++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }),
    );

    if (i + BATCH_SIZE < priceRows.length) await sleep(DELAY_MS);
  }

  return { synced, failed, total: priceRows.length };
}
