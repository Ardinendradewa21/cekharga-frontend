import { Prisma, ProductStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { normalizeForJson } from "@/server/db/normalize";
import { extractRamRomFromTitle, findBestVariantMatchByTitle, formatVariantLabel } from "@/server/utils/productMapping";
import { createSlug } from "@/server/utils/slug";
import { type ProductMutationInput, type ScraperIngestInput } from "@/server/validation/product";

// Include relasi standar untuk hampir semua query produk,
// supaya data yang dikirim ke UI sudah lengkap (brand, link marketplace, spesifikasi, review).
const productInclude = {
  brand: true,
  marketplace_links: {
    include: {
      marketplace: true,
    },
    orderBy: {
      harga: "asc",
    },
  },
  spesifikasi_produk: {
    orderBy: [{ updated_at: "desc" }, { id: "desc" }],
  },
  reviews: {
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
  },
  variants: {
    orderBy: [{ is_default: "desc" }, { ram_gb: "asc" }, { storage_gb: "asc" }, { id: "asc" }],
    include: {
      prices: {
        include: {
          marketplace: true,
        },
        orderBy: [{ price: "asc" }, { id: "asc" }],
      },
    },
  },
} satisfies Prisma.ProductInclude;

type ProductRecord = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
type DbClient = Prisma.TransactionClient | typeof prisma;

const truthyValues = new Set(["1", "true", "yes", "y", "ya", "ada", "support"]);
const falsyValues = new Set(["0", "false", "no", "n", "tidak", "none", "null", ""]);

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toBooleanLike(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value !== "string") return false;

  const normalized = value.trim().toLowerCase();
  if (truthyValues.has(normalized)) return true;
  if (falsyValues.has(normalized)) return false;
  return false;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateToMs(value: unknown): number | null {
  if (!value || typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function findMarketplaceLowestPrice(
  links: Record<string, unknown>[],
  marketplaceName: string,
): number | null {
  const normalizedTarget = marketplaceName.toLowerCase();
  const prices = links
    .filter((link) => Boolean(link.status_aktif))
    .filter((link) => String(link.nama_marketplace ?? "").toLowerCase().includes(normalizedTarget))
    .map((link) => toNumber(link.harga))
    .filter((value): value is number => value !== null);

  if (prices.length === 0) return null;
  return Math.min(...prices);
}

function mapSpecification(specRaw: Record<string, unknown> | null) {
  if (!specRaw) return null;

  return {
    ...specRaw,
    ukuran_layar: toNumber(specRaw.ukuran_layar),
    ada_slot_memori: Boolean(specRaw.ada_slot_memori),
    ada_nfc: Boolean(specRaw.ada_nfc),
    ada_jack_audio: Boolean(specRaw.ada_jack_audio),
    sound_jack: toBooleanLike(specRaw.sound_jack),
    kamera_utama_mp: toNumber(specRaw.kamera_utama_mp),
    kamera_selfie_mp: toNumber(specRaw.kamera_selfie_mp),
    kapasitas_baterai: toNumber(specRaw.kapasitas_baterai),
    skor_antutu: toNumber(specRaw.skor_antutu),
    skor_geekbench: toNumber(specRaw.skor_geekbench),
    skor_dxomark: toNumber(specRaw.skor_dxomark),
    bintang_performa: toNumber(specRaw.bintang_performa) ?? 0,
    bintang_kamera: toNumber(specRaw.bintang_kamera) ?? 0,
    bintang_baterai: toNumber(specRaw.bintang_baterai) ?? 0,
  };
}

function mapLegacyMarketplaceLink(link: Record<string, unknown>, productId: number) {
  return {
    ...link,
    id: toNumber(link.id) ?? 0,
    produk_id: toNumber(link.produk_id) ?? productId,
    marketplace_id: toNumber(link.marketplace_id),
    harga: toNumber(link.harga) ?? 0,
    status_aktif: Boolean(link.status_aktif),
    nama_marketplace: String(link.nama_marketplace ?? ""),
    nama_toko: (link.nama_toko as string | null | undefined) ?? null,
    url_produk: String(link.url_produk ?? ""),
    kondisi: String(link.kondisi ?? "baru"),
    variant_id: null,
    variant_label: null,
    title_raw: null,
    seller_name: (link.nama_toko as string | null | undefined) ?? null,
    created_at: (link.created_at as string | null | undefined) ?? null,
    updated_at: (link.updated_at as string | null | undefined) ?? null,
    last_synced_at: (link.updated_at as string | null | undefined) ?? (link.created_at as string | null | undefined) ?? null,
    marketplace_logo:
      ((link.marketplace as Record<string, unknown> | undefined)?.logo as string | undefined) ?? null,
    marketplace_type: String(link.nama_marketplace ?? "").toLowerCase(),
    marketplace: link.marketplace
      ? {
        ...(link.marketplace as Record<string, unknown>),
        id: toNumber((link.marketplace as Record<string, unknown>).id) ?? 0,
        }
      : null,
  };
}

function mapVariantPriceLink(
  productId: number,
  variantRaw: Record<string, unknown>,
  priceRaw: Record<string, unknown>,
) {
  const marketplaceRaw = (priceRaw.marketplace as Record<string, unknown> | undefined) ?? null;
  const ram = toNumber(variantRaw.ram_gb) ?? 0;
  const storage = toNumber(variantRaw.storage_gb) ?? 0;
  const warna = (variantRaw.warna as string | null | undefined) ?? null;
  const generatedLabel = formatVariantLabel({
    ram_gb: ram,
    storage_gb: storage,
    warna,
    label: (variantRaw.label as string | null | undefined) ?? null,
  });
  const marketplaceName = (marketplaceRaw?.nama as string | undefined) ?? "Marketplace";

  return {
    id: toNumber(priceRaw.id) ?? 0,
    produk_id: productId,
    marketplace_id: toNumber(priceRaw.marketplace_id),
    nama_marketplace: marketplaceName,
    nama_toko: (priceRaw.seller_name as string | null | undefined) ?? null,
    harga: toNumber(priceRaw.price) ?? 0,
    url_produk: String(priceRaw.affiliate_url ?? ""),
    kondisi: "baru",
    status_aktif: Boolean(priceRaw.is_active ?? true),
    created_at: (priceRaw.created_at as string | null | undefined) ?? null,
    updated_at: (priceRaw.updated_at as string | null | undefined) ?? null,
    variant_id: toNumber(priceRaw.variant_id),
    variant_label: generatedLabel,
    title_raw: (priceRaw.title_raw as string | null | undefined) ?? null,
    seller_name: (priceRaw.seller_name as string | null | undefined) ?? null,
    last_synced_at: (priceRaw.last_synced_at as string | null | undefined) ?? null,
    marketplace_logo: (marketplaceRaw?.logo as string | undefined) ?? null,
    marketplace_type: marketplaceName.toLowerCase(),
    marketplace: marketplaceRaw
      ? {
        ...marketplaceRaw,
        id: toNumber(marketplaceRaw.id) ?? 0,
        }
      : null,
  };
}

function mapProductRecord(record: ProductRecord) {
  // Semua data Prisma dinormalisasi dulu supaya aman saat di-serialize ke JSON.
  const row = normalizeForJson(record) as Record<string, unknown>;
  const productId = toNumber(row.id) ?? 0;
  const specifications = (row.spesifikasi_produk as Record<string, unknown>[] | undefined) ?? [];
  const newestSpecification = specifications.length > 0 ? mapSpecification(specifications[0] ?? null) : null;
  const legacyLinks = (row.marketplace_links as Record<string, unknown>[] | undefined) ?? [];
  const variantsRaw = (row.variants as Record<string, unknown>[] | undefined) ?? [];
  const mappedVariants = variantsRaw.map((variantRaw) => {
    const ram = toNumber(variantRaw.ram_gb) ?? 0;
    const storage = toNumber(variantRaw.storage_gb) ?? 0;
    const warna = (variantRaw.warna as string | null | undefined) ?? null;
    const pricesRaw = (variantRaw.prices as Record<string, unknown>[] | undefined) ?? [];
    const mappedPrices = pricesRaw.map((priceRaw) => mapVariantPriceLink(productId, variantRaw, priceRaw));

    return {
      id: toNumber(variantRaw.id) ?? 0,
      product_id: toNumber(variantRaw.product_id) ?? productId,
      sku: (variantRaw.sku as string | null | undefined) ?? null,
      ram_gb: ram,
      storage_gb: storage,
      warna,
      label: formatVariantLabel({
        ram_gb: ram,
        storage_gb: storage,
        warna,
        label: (variantRaw.label as string | null | undefined) ?? null,
      }),
      is_default: Boolean(variantRaw.is_default),
      status_aktif: Boolean(variantRaw.status_aktif ?? true),
      created_at: (variantRaw.created_at as string | null | undefined) ?? null,
      updated_at: (variantRaw.updated_at as string | null | undefined) ?? null,
      prices: mappedPrices,
    };
  });
  // Prioritaskan sumber harga dari arsitektur baru (variant -> prices).
  // Jika data baru belum ada, fallback ke relasi lama `marketplace_links` agar UI lama tetap hidup.
  const linksFromVariants = mappedVariants.flatMap((variant) => variant.prices);
  const links =
    linksFromVariants.length > 0
      ? linksFromVariants
      : legacyLinks.map((legacyLink) => mapLegacyMarketplaceLink(legacyLink, productId));
  const reviews = (row.reviews as Record<string, unknown>[] | undefined) ?? [];
  const activeLinks = links.filter((link) => Boolean(link.status_aktif));
  const priceUpdateMsList = activeLinks
    .map((link) => parseDateToMs(link.updated_at ?? link.created_at))
    .filter((value): value is number => value !== null);
  const nowMs = Date.now();
  const latestPriceUpdateMs = priceUpdateMsList.length > 0 ? Math.max(...priceUpdateMsList) : null;
  const priceAgeHours =
    latestPriceUpdateMs !== null ? Math.max(0, Math.round((nowMs - latestPriceUpdateMs) / 36_000) / 100) : null;
  const priceDataStatus =
    priceAgeHours === null ? "unknown" : priceAgeHours <= 24 ? "fresh" : priceAgeHours <= 72 ? "warning" : "stale";
  const shopeePrice = findMarketplaceLowestPrice(activeLinks, "shopee");
  const tokopediaPrice = findMarketplaceLowestPrice(activeLinks, "tokopedia");
  const blibliPrice = findMarketplaceLowestPrice(activeLinks, "blibli");
  const positiveActivePrices = activeLinks
    .map((link) => toNumber(link.harga))
    .filter((harga): harga is number => harga !== null && harga > 0);
  // Hindari Math.min([]) => Infinity saat semua harga kosong/0.
  const lowestActivePrice = positiveActivePrices.length > 0 ? Math.min(...positiveActivePrices) : null;
  const normalizedHargaBaru = lowestActivePrice ?? toNumber(row.harga_terendah_baru) ?? 0;
  const defaultVariant = mappedVariants.find((variant) => variant.is_default) ?? mappedVariants[0] ?? null;

  return {
    id: productId,
    nama_produk: (row.nama_produk as string) ?? "",
    slug: (row.slug as string) ?? "",
    foto: (row.foto as string | null) ?? null,
    id_brand: toNumber(row.id_brand) ?? 0,
    tahun_rilis: row.tahun_rilis ? String(row.tahun_rilis) : null,
    harga_terendah_baru: normalizedHargaBaru,
    harga_terendah_bekas: toNumber(row.harga_terendah_bekas) ?? 0,
    status: (row.status as string) ?? "aktif",
    // Kompatibilitas dua generasi field view:
    // prioritas `views` (baru), fallback `jumlah_dilihat` (lama).
    views: toNumber(row.views) ?? toNumber(row.jumlah_dilihat) ?? 0,
    jumlah_dilihat: toNumber(row.jumlah_dilihat) ?? 0,
    created_at: (row.created_at as string | null) ?? null,
    updated_at: (row.updated_at as string | null) ?? null,
    price_last_updated_at: latestPriceUpdateMs ? new Date(latestPriceUpdateMs).toISOString() : null,
    price_data_age_hours: priceAgeHours,
    price_data_status: priceDataStatus,
    price_source_count: activeLinks.length,
    shopee_price: shopeePrice,
    tokopedia_price: tokopediaPrice,
    blibli_price: blibliPrice,
    brand: row.brand
      ? {
          ...(row.brand as Record<string, unknown>),
          id: toNumber((row.brand as Record<string, unknown>).id) ?? 0,
        }
      : null,
    spesifikasi: newestSpecification,
    default_variant_id: defaultVariant?.id ?? null,
    variants: mappedVariants,
    marketplace_links: links,
    marketplace:
      links.length > 0
        ? {
            ...links[0],
            id: toNumber(links[0]?.id) ?? 0,
            harga: toNumber(links[0]?.harga) ?? 0,
          }
        : null,
    reviews: reviews.map((review) => ({
      ...review,
      id: toNumber(review.id) ?? 0,
      produk_id: toNumber(review.produk_id) ?? 0,
    })),
  };
}

function hasSpecificationValue(input: ProductMutationInput["spesifikasi"] | undefined): boolean {
  if (!input) return false;

  return Object.entries(input).some(([key, value]) => {
    if (key === "ada_slot_memori" || key === "ada_nfc" || key === "ada_jack_audio") {
      return Boolean(value);
    }

    if (key.startsWith("bintang_")) {
      return (typeof value === "number" ? value : 0) > 0;
    }

    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  });
}

function buildSpecificationCreateData(
  productId: bigint,
  specInput: ProductMutationInput["spesifikasi"] | undefined,
): Prisma.SpecificationUncheckedCreateInput | null {
  if (!specInput || !hasSpecificationValue(specInput)) return null;

  const now = new Date();
  const data: Prisma.SpecificationUncheckedCreateInput = {
    id_produk: productId,
    teknologi_jaringan: specInput.teknologi_jaringan ?? null,
    tanggal_rilis: parseDate(specInput.tanggal_rilis ?? null),
    dimensi: specInput.dimensi ?? null,
    berat: specInput.berat ?? null,
    rating_ip: specInput.rating_ip ?? null,
    tipe_layar: specInput.tipe_layar ?? null,
    ukuran_layar: specInput.ukuran_layar ?? null,
    resolusi: specInput.resolusi ?? null,
    proteksi_layar: specInput.proteksi_layar ?? null,
    os: specInput.os ?? null,
    chipset: specInput.chipset ?? null,
    ada_slot_memori: specInput.ada_slot_memori ?? false,
    tipe_memori: specInput.tipe_memori ?? null,
    kamera_utama_mp: specInput.kamera_utama_mp ?? null,
    detail_kamera_utama: specInput.detail_kamera_utama ?? null,
    kamera_utama_video: specInput.kamera_utama_video ?? null,
    video_kamera_utama: specInput.video_kamera_utama ?? null,
    kamera_selfie_mp: specInput.kamera_selfie_mp ?? null,
    kamera_selfie_video: specInput.kamera_selfie_video ?? null,
    detail_kamera_selfie: specInput.detail_kamera_selfie ?? null,
    ada_nfc: specInput.ada_nfc ?? false,
    ada_jack_audio: specInput.ada_jack_audio ?? false,
    kapasitas_baterai: specInput.kapasitas_baterai ?? null,
    kecepatan_cas: specInput.kecepatan_cas ?? null,
    sensor: specInput.sensor ?? null,
    skor_antutu: specInput.skor_antutu ?? null,
    skor_geekbench: specInput.skor_geekbench ?? null,
    skor_dxomark: specInput.skor_dxomark ?? null,
    bintang_performa: specInput.bintang_performa ?? 0,
    bintang_kamera: specInput.bintang_kamera ?? 0,
    bintang_baterai: specInput.bintang_baterai ?? 0,
    kesimpulan_singkat: specInput.kesimpulan_singkat ?? null,
    sound_loudspeaker: specInput.sound_loudspeaker ?? null,
    sound_jack: specInput.sound_jack ?? null,
    comms_wlan: specInput.comms_wlan ?? null,
    comms_bluetooth: specInput.comms_bluetooth ?? null,
    comms_gps: specInput.comms_gps ?? null,
    comms_usb: specInput.comms_usb ?? null,
    created_at: now,
    updated_at: now,
  };

  if (specInput.varian_internal !== null && specInput.varian_internal !== undefined) {
    data.varian_internal = specInput.varian_internal as Prisma.InputJsonValue;
  }

  return data;
}

async function getProductByIdWithClient(db: DbClient, productId: bigint) {
  return db.product.findUnique({
    where: { id: productId },
    include: productInclude,
  });
}

type MarketplaceReference = {
  marketplaceId: bigint | null;
  marketplaceName: string;
};

async function resolveMarketplaceReferenceForLink(
  tx: Prisma.TransactionClient,
  link: ProductMutationInput["marketplace_links"][number],
): Promise<MarketplaceReference> {
  const providedName = link.nama_marketplace.trim();

  // Product form tidak boleh menulis/membuat master marketplace.
  // Jika admin memilih marketplace_id, nama link dipaksa mengikuti data master.
  if (link.marketplace_id) {
    const targetId = BigInt(link.marketplace_id);
    const existing = await tx.marketplace.findUnique({
      where: { id: targetId },
      select: { id: true, nama: true },
    });

    if (!existing) {
      throw new Error("Marketplace yang dipilih tidak ditemukan di master data.");
    }

    return {
      marketplaceId: existing.id,
      marketplaceName: existing.nama,
    };
  }

  return {
    marketplaceId: null,
    marketplaceName: providedName,
  };
}

type VariantSeed = {
  ramGb: number;
  storageGb: number;
  warna: string | null;
  label: string | null;
};

function pushVariantToken(raw: unknown, collector: string[]) {
  if (raw === null || raw === undefined) return;

  if (Array.isArray(raw)) {
    for (const item of raw) {
      pushVariantToken(item, collector);
    }
    return;
  }

  if (typeof raw === "object") {
    for (const value of Object.values(raw as Record<string, unknown>)) {
      pushVariantToken(value, collector);
    }
    return;
  }

  if (typeof raw !== "string") return;
  const trimmed = raw.trim();
  if (!trimmed) return;

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      pushVariantToken(parsed, collector);
      return;
    } catch {
      // Lanjut ke fallback split text biasa.
    }
  }

  for (const part of trimmed.split(/[,;|]/g)) {
    const token = part.trim();
    if (token) {
      collector.push(token);
    }
  }
}

function buildVariantSeeds(input: ProductMutationInput): VariantSeed[] {
  const rawTokens: string[] = [];
  pushVariantToken(input.spesifikasi?.varian_internal, rawTokens);

  // Fallback ke nama produk supaya minimal ada satu kandidat varian
  // meskipun field varian_internal belum diisi admin.
  if (rawTokens.length === 0) {
    rawTokens.push(input.nama_produk);
  }

  const dedup = new Map<string, VariantSeed>();

  for (const token of rawTokens) {
    const extracted = extractRamRomFromTitle(token);
    if (extracted.ramGb === null || extracted.storageGb === null) {
      continue;
    }

    const ramGb = extracted.ramGb;
    const storageGb = extracted.storageGb;
    const seed: VariantSeed = {
      ramGb,
      storageGb,
      warna: null,
      label: `${ramGb}/${storageGb}GB`,
    };

    dedup.set(`${ramGb}-${storageGb}-`, seed);
  }

  if (dedup.size > 0) {
    return Array.from(dedup.values()).sort((a, b) => {
      if (a.ramGb !== b.ramGb) return a.ramGb - b.ramGb;
      return a.storageGb - b.storageGb;
    });
  }

  return [
    {
      ramGb: 0,
      storageGb: 0,
      warna: null,
      label: "Default",
    },
  ];
}

async function syncProductVariantsAndPrices(
  tx: Prisma.TransactionClient,
  productId: bigint,
  input: ProductMutationInput,
) {
  const now = new Date();

  // Source of truth untuk jalur form admin adalah payload terbaru dari form.
  // Karena itu relasi variant/price dibangun ulang agar sinkron dengan input saat ini.
  await tx.productPrice.deleteMany({
    where: {
      variant: {
        product_id: productId,
      },
    },
  });

  await tx.productVariant.deleteMany({
    where: { product_id: productId },
  });

  const variantSeeds = buildVariantSeeds(input);
  const createdVariants: Array<{ id: bigint; label: string; isDefault: boolean }> = [];

  for (let index = 0; index < variantSeeds.length; index += 1) {
    const seed = variantSeeds[index];
    const isDefault = index === 0;

    const created = await tx.productVariant.create({
      data: {
        product_id: productId,
        ram_gb: seed.ramGb,
        storage_gb: seed.storageGb,
        warna: seed.warna,
        label: formatVariantLabel({
          ram_gb: seed.ramGb,
          storage_gb: seed.storageGb,
          warna: seed.warna,
          label: seed.label,
        }),
        is_default: isDefault,
        status_aktif: true,
        created_at: now,
        updated_at: now,
      },
      select: {
        id: true,
        label: true,
        is_default: true,
      },
    });

    createdVariants.push({
      id: created.id,
      label: created.label ?? "Default",
      isDefault: created.is_default,
    });
  }

  const defaultVariant = createdVariants.find((variant) => variant.isDefault) ?? createdVariants[0];
  if (!defaultVariant) return;

  for (const link of input.marketplace_links) {
    await tx.productPrice.create({
      data: {
        variant_id: defaultVariant.id,
        marketplace_id: link.marketplace_id ? BigInt(link.marketplace_id) : null,
        title_raw: input.nama_produk,
        seller_name: link.nama_toko ?? null,
        price: link.harga,
        affiliate_url: link.url_produk,
        currency: "IDR",
        is_active: link.status_aktif ?? true,
        last_synced_at: now,
        created_at: now,
        updated_at: now,
      },
    });
  }

  const lowestPrice = await tx.productPrice.findFirst({
    where: {
      variant: {
        product_id: productId,
      },
      is_active: true,
    },
    orderBy: { price: "asc" },
    select: { price: true },
  });

  await tx.product.update({
    where: { id: productId },
    data: {
      harga_terendah_baru: lowestPrice?.price ?? input.harga_terendah_baru ?? null,
      updated_at: now,
    },
  });
}

async function syncProductRelations(tx: Prisma.TransactionClient, productId: bigint, input: ProductMutationInput) {
  const now = new Date();

  // Strategi sederhana: hapus relasi lama lalu isi ulang dari form terbaru.
  // Ini menjaga hasil sinkron dengan input editor.
  await tx.marketplaceLink.deleteMany({ where: { produk_id: productId } });
  await tx.specification.deleteMany({ where: { id_produk: productId } });
  await tx.review.deleteMany({ where: { produk_id: productId } });

  const specificationData = buildSpecificationCreateData(productId, input.spesifikasi);
  if (specificationData) {
    await tx.specification.create({ data: specificationData });
  }

  if (input.marketplace_links.length > 0) {
    for (const link of input.marketplace_links) {
      const marketplaceRef = await resolveMarketplaceReferenceForLink(tx, link);

      await tx.marketplaceLink.create({
        data: {
          produk_id: productId,
          marketplace_id: marketplaceRef.marketplaceId,
          nama_marketplace: marketplaceRef.marketplaceName,
          nama_toko: link.nama_toko ?? null,
          harga: link.harga,
          url_produk: link.url_produk,
          kondisi: link.kondisi || "baru",
          status_aktif: link.status_aktif ?? true,
          created_at: now,
          updated_at: now,
        },
      });
    }
  }

  if (input.reviews.length > 0) {
    await tx.review.createMany({
      data: input.reviews.map((review) => ({
        produk_id: productId,
        reviewer_name: review.reviewer_name,
        platform: review.platform,
        video_url: review.video_url,
        highlight_quote: review.highlight_quote ?? null,
        created_at: now,
        updated_at: now,
      })),
    });
  }

  await syncProductVariantsAndPrices(tx, productId, input);
}

async function getBrandIdsBySlugs(slugs: string[]): Promise<bigint[]> {
  if (slugs.length === 0) return [];

  const brands = await prisma.brand.findMany({
    where: { slug: { in: slugs } },
    select: { id: true },
  });
  return brands.map((brand) => brand.id);
}

async function resolveBrandId(input: ScraperIngestInput): Promise<number> {
  if (input.id_brand) return input.id_brand;

  if (input.brand_slug) {
    const existingBySlug = await prisma.brand.findUnique({
      where: { slug: input.brand_slug },
      select: { id: true },
    });
    if (existingBySlug) return Number(existingBySlug.id);
  }

  if (input.brand_name) {
    const normalizedSlug = createSlug(input.brand_name);
    const existingByName = await prisma.brand.findFirst({
      where: {
        OR: [{ slug: normalizedSlug }, { nama_brand: { equals: input.brand_name, mode: "insensitive" } }],
      },
      select: { id: true },
    });

    if (existingByName) return Number(existingByName.id);

    const now = new Date();
    const created = await prisma.brand.create({
      data: {
        nama_brand: input.brand_name,
        slug: normalizedSlug,
        created_at: now,
        updated_at: now,
      },
      select: { id: true },
    });
    return Number(created.id);
  }

  throw new Error("Brand tidak ditemukan.");
}

export type ProductListQuery = {
  search?: string;
  brandSlugs?: string[];
  minPrice?: number;
  maxPrice?: number;
  hasNfc?: boolean;
  useCase?: "gaming" | "camera" | "battery" | "daily";
  status?: "aktif" | "draft" | "all";
  sort?: string;
  page?: number;
  limit?: number;
  includeDraft?: boolean;
};

export type ProductListResult = {
  data: ReturnType<typeof mapProductRecord>[];
  total: number;
  currentPage: number;
  lastPage: number;
};

export type BrandListItem = {
  id: number;
  nama_brand: string;
  slug: string;
  logo: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type MarketplaceListItem = {
  id: number;
  nama: string;
  slug: string;
  logo: string | null;
  warna_hex: string;
  text_color: string;
  created_at: string | null;
  updated_at: string | null;
};

type CreateBrandInput = {
  nama_brand: string;
  logo?: string | null;
};

type CreateMarketplaceInput = {
  nama: string;
  logo?: string | null;
};

function mapBrandListItem(brand: Record<string, unknown>): BrandListItem {
  return {
    id: toNumber(brand.id) ?? 0,
    nama_brand: (brand.nama_brand as string) ?? "",
    slug: (brand.slug as string) ?? "",
    logo: (brand.logo as string | null) ?? null,
    created_at: (brand.created_at as string | null) ?? null,
    updated_at: (brand.updated_at as string | null) ?? null,
  };
}

function mapMarketplaceListItem(marketplace: Record<string, unknown>): MarketplaceListItem {
  return {
    id: toNumber(marketplace.id) ?? 0,
    nama: (marketplace.nama as string) ?? "",
    slug: (marketplace.slug as string) ?? "",
    logo: (marketplace.logo as string | null) ?? null,
    warna_hex: (marketplace.warna_hex as string) ?? "#000000",
    text_color: (marketplace.text_color as string) ?? "#ffffff",
    created_at: (marketplace.created_at as string | null) ?? null,
    updated_at: (marketplace.updated_at as string | null) ?? null,
  };
}

export async function listBrands() {
  const brands = await prisma.brand.findMany({
    orderBy: { nama_brand: "asc" },
  });

  const normalized = normalizeForJson(brands) as Array<Record<string, unknown>>;
  return normalized.map(mapBrandListItem) as BrandListItem[];
}

export async function listMarketplaces() {
  const marketplaces = await prisma.marketplace.findMany({
    orderBy: { nama: "asc" },
  });

  const normalized = normalizeForJson(marketplaces) as Array<Record<string, unknown>>;
  return normalized.map(mapMarketplaceListItem) as MarketplaceListItem[];
}

export async function createOrReuseBrand(input: CreateBrandInput): Promise<BrandListItem> {
  const namaBrand = input.nama_brand.trim();
  if (namaBrand.length < 2) {
    throw new Error("Nama brand minimal 2 karakter.");
  }

  const slug = createSlug(namaBrand);
  if (!slug) {
    throw new Error("Nama brand tidak valid.");
  }

  const now = new Date();
  const normalizedLogo = input.logo?.trim() ? input.logo.trim() : null;

  const existing = await prisma.brand.findFirst({
    where: {
      OR: [{ slug }, { nama_brand: { equals: namaBrand, mode: "insensitive" } }],
    },
  });

  if (existing) {
    const shouldUpdateLogo = normalizedLogo !== null && normalizedLogo !== existing.logo;
    const shouldUpdateName = existing.nama_brand !== namaBrand;
    const shouldUpdateSlug = existing.slug !== slug;

    const updated =
      shouldUpdateLogo || shouldUpdateName || shouldUpdateSlug
        ? await prisma.brand.update({
            where: { id: existing.id },
            data: {
              nama_brand: namaBrand,
              slug,
              ...(shouldUpdateLogo ? { logo: normalizedLogo } : {}),
              updated_at: now,
            },
          })
        : existing;

    const normalized = normalizeForJson(updated) as Record<string, unknown>;
    return mapBrandListItem(normalized);
  }

  const created = await prisma.brand.create({
    data: {
      nama_brand: namaBrand,
      slug,
      logo: normalizedLogo,
      created_at: now,
      updated_at: now,
    },
  });

  const normalized = normalizeForJson(created) as Record<string, unknown>;
  return mapBrandListItem(normalized);
}

export async function createOrReuseMarketplace(input: CreateMarketplaceInput): Promise<MarketplaceListItem> {
  const namaMarketplace = input.nama.trim();
  if (namaMarketplace.length < 2) {
    throw new Error("Nama marketplace minimal 2 karakter.");
  }

  const slug = createSlug(namaMarketplace);
  if (!slug) {
    throw new Error("Nama marketplace tidak valid.");
  }

  const now = new Date();
  const normalizedLogo = input.logo?.trim() ? input.logo.trim() : null;

  const existing = await prisma.marketplace.findFirst({
    where: {
      OR: [{ slug }, { nama: { equals: namaMarketplace, mode: "insensitive" } }],
    },
  });

  if (existing) {
    const shouldUpdateLogo = normalizedLogo !== null && normalizedLogo !== existing.logo;
    const shouldUpdateName = existing.nama !== namaMarketplace;
    const shouldUpdateSlug = existing.slug !== slug;

    const updated =
      shouldUpdateLogo || shouldUpdateName || shouldUpdateSlug
        ? await prisma.marketplace.update({
            where: { id: existing.id },
            data: {
              nama: namaMarketplace,
              slug,
              ...(shouldUpdateLogo ? { logo: normalizedLogo } : {}),
              updated_at: now,
            },
          })
        : existing;

    const normalized = normalizeForJson(updated) as Record<string, unknown>;
    return mapMarketplaceListItem(normalized);
  }

  const created = await prisma.marketplace.create({
    data: {
      nama: namaMarketplace,
      slug,
      logo: normalizedLogo,
      warna_hex: "#000000",
      text_color: "#ffffff",
      created_at: now,
      updated_at: now,
    },
  });

  const normalized = normalizeForJson(created) as Record<string, unknown>;
  return mapMarketplaceListItem(normalized);
}

export async function listProducts(query: ProductListQuery): Promise<ProductListResult> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(50, Math.max(1, query.limit ?? 12));
  const skip = (page - 1) * limit;

  const normalizedSearch = query.search?.trim();
  const brandSlugs = (query.brandSlugs ?? []).map((slug) => slug.trim()).filter(Boolean);

  const whereAnd: Prisma.ProductWhereInput[] = [];

  // Kumpulkan filter satu per satu, lalu digabung jadi AND agar query fleksibel.
  if (query.status && query.status !== "all") {
    whereAnd.push({
      status: query.status as ProductStatus,
    });
  } else if (!query.includeDraft) {
    whereAnd.push({
      status: ProductStatus.aktif,
    });
  }

  if (normalizedSearch) {
    whereAnd.push({
      nama_produk: { contains: normalizedSearch, mode: "insensitive" },
    });
  }

  if (brandSlugs.length > 0) {
    const brandIds = await getBrandIdsBySlugs(brandSlugs);
    if (brandIds.length === 0) {
      return {
        data: [],
        total: 0,
        currentPage: page,
        lastPage: 1,
      };
    }
    whereAnd.push({
      id_brand: { in: brandIds },
    });
  }

  if (query.hasNfc) {
    whereAnd.push({
      spesifikasi_produk: {
        some: {
          ada_nfc: true,
        },
      },
    });
  }

  if (query.useCase === "gaming") {
    whereAnd.push({
      spesifikasi_produk: {
        some: {
          skor_antutu: { gte: 700000 },
        },
      },
    });
  } else if (query.useCase === "camera") {
    whereAnd.push({
      spesifikasi_produk: {
        some: {
          kamera_utama_mp: { gte: 50 },
        },
      },
    });
  } else if (query.useCase === "battery") {
    whereAnd.push({
      spesifikasi_produk: {
        some: {
          kapasitas_baterai: { gte: 5000 },
        },
      },
    });
  } else if (query.useCase === "daily") {
    whereAnd.push({
      spesifikasi_produk: {
        some: {
          ada_nfc: true,
          kapasitas_baterai: { gte: 4500 },
        },
      },
    });
  }

  const where: Prisma.ProductWhereInput = whereAnd.length > 0 ? { AND: whereAnd } : {};
  const products = await prisma.product.findMany({
    where,
    include: productInclude,
  });

  let mapped = products.map(mapProductRecord);

  if (typeof query.minPrice === "number" && Number.isFinite(query.minPrice)) {
    mapped = mapped.filter((product) => {
      const candidatePrice = typeof product.harga_terendah_baru === "number" ? product.harga_terendah_baru : 0;
      return candidatePrice > 0 && candidatePrice >= query.minPrice!;
    });
  }

  if (typeof query.maxPrice === "number" && Number.isFinite(query.maxPrice)) {
    mapped = mapped.filter((product) => {
      const candidatePrice = typeof product.harga_terendah_baru === "number" ? product.harga_terendah_baru : 0;
      return candidatePrice > 0 && candidatePrice <= query.maxPrice!;
    });
  }

  if (query.sort === "termurah") {
    mapped.sort((a, b) => {
      const aPrice = a.harga_terendah_baru > 0 ? a.harga_terendah_baru : Number.MAX_SAFE_INTEGER;
      const bPrice = b.harga_terendah_baru > 0 ? b.harga_terendah_baru : Number.MAX_SAFE_INTEGER;
      return aPrice - bPrice;
    });
  } else if (query.sort === "termahal") {
    mapped.sort((a, b) => {
      const aPrice = a.harga_terendah_baru > 0 ? a.harga_terendah_baru : -1;
      const bPrice = b.harga_terendah_baru > 0 ? b.harga_terendah_baru : -1;
      return bPrice - aPrice;
    });
  } else if (query.sort === "brand_asc") {
    mapped.sort((a, b) =>
      String((a.brand as { nama_brand?: string } | null)?.nama_brand ?? "").localeCompare(
        String((b.brand as { nama_brand?: string } | null)?.nama_brand ?? ""),
        "id",
        { sensitivity: "base" },
      ),
    );
  } else if (query.sort === "brand_desc") {
    mapped.sort((a, b) =>
      String((b.brand as { nama_brand?: string } | null)?.nama_brand ?? "").localeCompare(
        String((a.brand as { nama_brand?: string } | null)?.nama_brand ?? ""),
        "id",
        { sensitivity: "base" },
      ),
    );
  } else if (query.sort === "antutu") {
    mapped.sort((a, b) => (b.spesifikasi?.skor_antutu ?? -1) - (a.spesifikasi?.skor_antutu ?? -1));
  } else {
    mapped.sort((a, b) => {
      const aTime = parseDateToMs(a.created_at) ?? 0;
      const bTime = parseDateToMs(b.created_at) ?? 0;
      if (aTime !== bTime) return bTime - aTime;
      return b.id - a.id;
    });
  }

  const total = mapped.length;
  const paged = mapped.slice(skip, skip + limit);

  return {
    data: paged,
    total,
    currentPage: page,
    lastPage: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getProductBySlug(slug: string, options?: { includeDraft?: boolean }) {
  const where: Prisma.ProductWhereInput = options?.includeDraft
    ? { slug }
    : {
        slug,
        status: ProductStatus.aktif,
      };

  const product = await prisma.product.findFirst({
    where,
    include: productInclude,
  });

  if (!product) return null;
  return mapProductRecord(product);
}

export async function getProductById(productId: number) {
  const product = await getProductByIdWithClient(prisma, BigInt(productId));
  if (!product) return null;
  return mapProductRecord(product);
}

export async function createProduct(input: ProductMutationInput) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();

    await tx.brand.update({
      where: { id: BigInt(input.id_brand) },
      data: {
        logo: input.brand_logo ?? null,
        updated_at: now,
      },
    });

    const created = await tx.product.create({
      data: {
        nama_produk: input.nama_produk,
        slug: input.slug,
        foto: input.foto ?? null,
        id_brand: BigInt(input.id_brand),
        tahun_rilis: input.tahun_rilis ?? null,
        harga_terendah_baru: input.harga_terendah_baru ?? null,
        harga_terendah_bekas: input.harga_terendah_bekas ?? null,
        status: input.status as ProductStatus,
        // Simpan ke field baru + lama agar dashboard lama/baru tetap konsisten.
        views: input.jumlah_dilihat ?? 0,
        jumlah_dilihat: BigInt(input.jumlah_dilihat ?? 0),
        created_at: now,
        updated_at: now,
      },
    });

    await syncProductRelations(tx, created.id, input);

    const withRelations = await getProductByIdWithClient(tx, created.id);
    if (!withRelations) throw new Error("Produk gagal dibuat.");
    return mapProductRecord(withRelations);
  });
}

export async function updateProduct(productId: number, input: ProductMutationInput) {
  return prisma.$transaction(async (tx) => {
    const targetId = BigInt(productId);
    const now = new Date();

    await tx.brand.update({
      where: { id: BigInt(input.id_brand) },
      data: {
        logo: input.brand_logo ?? null,
        updated_at: now,
      },
    });

    await tx.product.update({
      where: { id: targetId },
      data: {
        nama_produk: input.nama_produk,
        slug: input.slug,
        foto: input.foto ?? null,
        id_brand: BigInt(input.id_brand),
        tahun_rilis: input.tahun_rilis ?? null,
        harga_terendah_baru: input.harga_terendah_baru ?? null,
        harga_terendah_bekas: input.harga_terendah_bekas ?? null,
        status: input.status as ProductStatus,
        // Sama seperti create: update kedua field view sekaligus.
        views: input.jumlah_dilihat ?? 0,
        jumlah_dilihat: BigInt(input.jumlah_dilihat ?? 0),
        updated_at: now,
      },
    });

    await syncProductRelations(tx, targetId, input);

    const withRelations = await getProductByIdWithClient(tx, targetId);
    if (!withRelations) throw new Error("Produk tidak ditemukan.");
    return mapProductRecord(withRelations);
  });
}

export async function deleteProduct(productId: number) {
  await prisma.product.delete({
    where: { id: BigInt(productId) },
  });
}

export type ProductPriceSyncInput = {
  productSlug: string;
  title: string;
  price: number;
  affiliateUrl: string;
  sellerName?: string | null;
  marketplaceId?: number | null;
  marketplaceSlug?: string | null;
  payload?: unknown;
};

export type ProductPriceSyncResult = {
  success: boolean;
  mapped: boolean;
  message: string;
  variantId?: number;
  variantLabel?: string;
  priceId?: number;
  unmappedId?: number;
};

async function resolveMarketplaceReference(input: ProductPriceSyncInput) {
  if (typeof input.marketplaceId === "number" && Number.isFinite(input.marketplaceId)) {
    const marketplace = await prisma.marketplace.findUnique({
      where: { id: BigInt(input.marketplaceId) },
      select: { id: true, nama: true, slug: true },
    });
    return marketplace;
  }

  const slug = input.marketplaceSlug?.trim();
  if (slug) {
    const marketplace = await prisma.marketplace.findFirst({
      where: { slug: slug.toLowerCase() },
      select: { id: true, nama: true, slug: true },
    });
    return marketplace;
  }

  return null;
}

export async function upsertProductPriceByTitle(input: ProductPriceSyncInput): Promise<ProductPriceSyncResult> {
  const productSlug = input.productSlug.trim();
  if (!productSlug) {
    return {
      success: false,
      mapped: false,
      message: "Slug produk wajib diisi.",
    };
  }

  const title = input.title.trim();
  if (!title) {
    return {
      success: false,
      mapped: false,
      message: "Judul produk marketplace wajib diisi.",
    };
  }

  if (!Number.isFinite(input.price) || input.price <= 0) {
    return {
      success: false,
      mapped: false,
      message: "Harga produk tidak valid.",
    };
  }

  const affiliateUrl = input.affiliateUrl.trim();
  if (!affiliateUrl) {
    return {
      success: false,
      mapped: false,
      message: "URL produk marketplace wajib diisi.",
    };
  }

  const product = await prisma.product.findUnique({
    where: { slug: productSlug },
    select: {
      id: true,
      variants: {
        where: { status_aktif: true },
        select: {
          id: true,
          ram_gb: true,
          storage_gb: true,
          warna: true,
          label: true,
          sku: true,
        },
      },
    },
  });

  if (!product) {
    return {
      success: false,
      mapped: false,
      message: "Produk parent tidak ditemukan.",
    };
  }

  const variants = product.variants.map((variant) => ({
    id: Number(variant.id),
    ram_gb: variant.ram_gb,
    storage_gb: variant.storage_gb,
    warna: variant.warna,
    label: variant.label,
    sku: variant.sku,
  }));

  const mappingResult = findBestVariantMatchByTitle(title, variants);
  const marketplace = await resolveMarketplaceReference(input);

  if (!mappingResult.variant) {
    // Data dari marketplace sengaja tidak dipaksa masuk ke varian yang salah.
    // Item disimpan ke tabel review agar admin bisa mapping manual.
    const now = new Date();
    const unmapped = await prisma.unmappedProduct.create({
      data: {
        product_id: product.id,
        marketplace_id: marketplace?.id ?? null,
        external_title: title,
        external_url: affiliateUrl,
        normalized_title: mappingResult.extracted.normalizedTitle,
        extracted_ram_gb: mappingResult.extracted.ramGb,
        extracted_storage_gb: mappingResult.extracted.storageGb,
        ...(input.payload !== undefined
          ? { payload: input.payload as Prisma.InputJsonValue }
          : {}),
        status: "unmapped",
        notes: "Varian tidak cocok dengan data ProductVariant yang tersedia.",
        created_at: now,
        updated_at: now,
      },
      select: { id: true },
    });

    return {
      success: true,
      mapped: false,
      message: "Varian tidak cocok. Data dicatat sebagai Unmapped Product untuk review admin.",
      unmappedId: Number(unmapped.id),
    };
  }

  const targetVariantId = BigInt(mappingResult.variant.id);
  const now = new Date();

  const synced = await prisma.$transaction(async (tx) => {
    const existing = await tx.productPrice.findFirst({
      where: {
        variant_id: targetVariantId,
        marketplace_id: marketplace?.id ?? null,
        affiliate_url: affiliateUrl,
      },
      select: { id: true },
    });

    const priceRecord = existing
      ? await tx.productPrice.update({
          where: { id: existing.id },
          data: {
            title_raw: title,
            seller_name: input.sellerName?.trim() || null,
            price: input.price,
            is_active: true,
            last_synced_at: now,
            updated_at: now,
          },
          select: { id: true },
        })
      : await tx.productPrice.create({
          data: {
            variant_id: targetVariantId,
            marketplace_id: marketplace?.id ?? null,
            title_raw: title,
            seller_name: input.sellerName?.trim() || null,
            price: input.price,
            affiliate_url: affiliateUrl,
            currency: "IDR",
            is_active: true,
            last_synced_at: now,
            created_at: now,
            updated_at: now,
          },
          select: { id: true },
        });

    const lowestPrice = await tx.productPrice.findFirst({
      where: {
        variant: {
          product_id: product.id,
        },
        is_active: true,
      },
      orderBy: { price: "asc" },
      select: { price: true },
    });

    await tx.product.update({
      where: { id: product.id },
      data: {
        harga_terendah_baru: lowestPrice?.price ?? null,
        updated_at: now,
      },
    });

    return priceRecord;
  });

  return {
    success: true,
    mapped: true,
    message: "Harga berhasil disinkronkan ke ProductVariant yang cocok.",
    variantId: Number(targetVariantId),
    variantLabel: formatVariantLabel(mappingResult.variant),
    priceId: Number(synced.id),
  };
}

export async function upsertScrapedProduct(input: ScraperIngestInput) {
  const brandId = await resolveBrandId(input);
  const slug = createSlug(input.slug || input.nama_produk);

  const payload: ProductMutationInput = {
    nama_produk: input.nama_produk,
    slug,
    id_brand: brandId,
    brand_logo: input.brand_logo ?? null,
    foto: input.foto ?? null,
    tahun_rilis: input.tahun_rilis ?? null,
    harga_terendah_baru: input.harga_terendah_baru ?? null,
    harga_terendah_bekas: input.harga_terendah_bekas ?? null,
    status: "aktif",
    jumlah_dilihat: 0,
    spesifikasi: input.spesifikasi,
    marketplace_links: input.marketplace_links ?? [],
    reviews: input.reviews ?? [],
  };

  const existing = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  });

  const savedProduct = existing
    ? await updateProduct(Number(existing.id), payload)
    : await createProduct(payload);

  if (input.marketplace_prices.length > 0) {
    for (const priceItem of input.marketplace_prices) {
      await upsertProductPriceByTitle({
        productSlug: slug,
        title: priceItem.title,
        price: priceItem.price,
        affiliateUrl: priceItem.affiliate_url,
        sellerName: priceItem.seller_name ?? null,
        marketplaceId: priceItem.marketplace_id ?? null,
        marketplaceSlug: priceItem.marketplace_slug ?? null,
        payload: priceItem.payload,
      });
    }
  }

  const refreshed = await getProductBySlug(slug, { includeDraft: true });
  return refreshed ?? savedProduct;
}
