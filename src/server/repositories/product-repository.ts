import { Prisma, ProductStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { normalizeForJson } from "@/server/db/normalize";
import { createSlug } from "@/server/utils/slug";
import { type ProductMutationInput, type ScraperIngestInput } from "@/server/validation/product";

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

function mapProductRecord(record: ProductRecord) {
  const row = normalizeForJson(record) as Record<string, unknown>;
  const specifications = (row.spesifikasi_produk as Record<string, unknown>[] | undefined) ?? [];
  const newestSpecification = specifications.length > 0 ? mapSpecification(specifications[0] ?? null) : null;
  const links = (row.marketplace_links as Record<string, unknown>[] | undefined) ?? [];
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
  const shopeePrice = findMarketplaceLowestPrice(links, "shopee");
  const tokopediaPrice = findMarketplaceLowestPrice(links, "tokopedia");
  const blibliPrice = findMarketplaceLowestPrice(links, "blibli");

  return {
    id: toNumber(row.id) ?? 0,
    nama_produk: (row.nama_produk as string) ?? "",
    slug: (row.slug as string) ?? "",
    foto: (row.foto as string | null) ?? null,
    id_brand: toNumber(row.id_brand) ?? 0,
    tahun_rilis: row.tahun_rilis ? String(row.tahun_rilis) : null,
    harga_terendah_baru: toNumber(row.harga_terendah_baru) ?? 0,
    harga_terendah_bekas: toNumber(row.harga_terendah_bekas) ?? 0,
    status: (row.status as string) ?? "aktif",
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
    marketplace_links: links.map((link) => ({
      ...link,
      id: toNumber(link.id) ?? 0,
      produk_id: toNumber(link.produk_id) ?? 0,
      marketplace_id: toNumber(link.marketplace_id),
      harga: toNumber(link.harga) ?? 0,
      status_aktif: Boolean(link.status_aktif),
      marketplace_logo:
        ((link.marketplace as Record<string, unknown> | undefined)?.logo as string | undefined) ?? null,
      marketplace_type: String(link.nama_marketplace ?? "").toLowerCase(),
      marketplace: link.marketplace
        ? {
          ...(link.marketplace as Record<string, unknown>),
          id: toNumber((link.marketplace as Record<string, unknown>).id) ?? 0,
          }
        : null,
    })),
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

async function resolveMarketplaceIdForLink(
  tx: Prisma.TransactionClient,
  link: ProductMutationInput["marketplace_links"][number],
  now: Date,
): Promise<bigint | null> {
  const normalizedName = link.nama_marketplace.trim();
  const normalizedSlug = createSlug(normalizedName);

  if (link.marketplace_id) {
    const targetId = BigInt(link.marketplace_id);
    await tx.marketplace.update({
      where: { id: targetId },
      data: {
        nama: normalizedName,
        slug: normalizedSlug,
        logo: link.marketplace_logo ?? null,
        updated_at: now,
      },
    });
    return targetId;
  }

  const existing = await tx.marketplace.findFirst({
    where: {
      OR: [{ slug: normalizedSlug }, { nama: normalizedName }],
    },
    select: { id: true },
  });

  if (existing) {
    await tx.marketplace.update({
      where: { id: existing.id },
      data: {
        nama: normalizedName,
        slug: normalizedSlug,
        logo: link.marketplace_logo ?? null,
        updated_at: now,
      },
    });
    return existing.id;
  }

  const created = await tx.marketplace.create({
    data: {
      nama: normalizedName,
      slug: normalizedSlug,
      logo: link.marketplace_logo ?? null,
      warna_hex: "#000000",
      text_color: "#ffffff",
      created_at: now,
      updated_at: now,
    },
    select: { id: true },
  });

  return created.id;
}

async function syncProductRelations(tx: Prisma.TransactionClient, productId: bigint, input: ProductMutationInput) {
  const now = new Date();

  await tx.marketplaceLink.deleteMany({ where: { produk_id: productId } });
  await tx.specification.deleteMany({ where: { id_produk: productId } });
  await tx.review.deleteMany({ where: { produk_id: productId } });

  const specificationData = buildSpecificationCreateData(productId, input.spesifikasi);
  if (specificationData) {
    await tx.specification.create({ data: specificationData });
  }

  if (input.marketplace_links.length > 0) {
    for (const link of input.marketplace_links) {
      const marketplaceId = await resolveMarketplaceIdForLink(tx, link, now);

      await tx.marketplaceLink.create({
        data: {
          produk_id: productId,
          marketplace_id: marketplaceId,
          nama_marketplace: link.nama_marketplace,
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
        OR: [{ slug: normalizedSlug }, { nama_brand: input.brand_name }],
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

export async function listBrands() {
  const brands = await prisma.brand.findMany({
    orderBy: { nama_brand: "asc" },
  });

  const normalized = normalizeForJson(brands) as Array<Record<string, unknown>>;
  return normalized.map((brand) => ({
    id: toNumber(brand.id) ?? 0,
    nama_brand: (brand.nama_brand as string) ?? "",
    slug: (brand.slug as string) ?? "",
    logo: (brand.logo as string | null) ?? null,
    created_at: (brand.created_at as string | null) ?? null,
    updated_at: (brand.updated_at as string | null) ?? null,
  })) as BrandListItem[];
}

export async function listMarketplaces() {
  const marketplaces = await prisma.marketplace.findMany({
    orderBy: { nama: "asc" },
  });

  const normalized = normalizeForJson(marketplaces) as Array<Record<string, unknown>>;
  return normalized.map((marketplace) => ({
    id: toNumber(marketplace.id) ?? 0,
    nama: (marketplace.nama as string) ?? "",
    slug: (marketplace.slug as string) ?? "",
    logo: (marketplace.logo as string | null) ?? null,
    warna_hex: (marketplace.warna_hex as string) ?? "#000000",
    text_color: (marketplace.text_color as string) ?? "#ffffff",
    created_at: (marketplace.created_at as string | null) ?? null,
    updated_at: (marketplace.updated_at as string | null) ?? null,
  })) as MarketplaceListItem[];
}

export async function listProducts(query: ProductListQuery): Promise<ProductListResult> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(50, Math.max(1, query.limit ?? 12));
  const skip = (page - 1) * limit;

  const normalizedSearch = query.search?.trim();
  const brandSlugs = (query.brandSlugs ?? []).map((slug) => slug.trim()).filter(Boolean);

  const whereAnd: Prisma.ProductWhereInput[] = [];

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
      nama_produk: { contains: normalizedSearch },
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

  if (typeof query.minPrice === "number" && Number.isFinite(query.minPrice)) {
    whereAnd.push({
      harga_terendah_bekas: { gte: new Prisma.Decimal(query.minPrice) },
    });
  }

  if (typeof query.maxPrice === "number" && Number.isFinite(query.maxPrice)) {
    whereAnd.push({
      harga_terendah_bekas: { lte: new Prisma.Decimal(query.maxPrice) },
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

  if (query.sort === "antutu") {
    const products = await prisma.product.findMany({
      where,
      include: productInclude,
    });

    const mapped = products
      .map(mapProductRecord)
      .sort((a, b) => (b.spesifikasi?.skor_antutu ?? -1) - (a.spesifikasi?.skor_antutu ?? -1));

    const total = mapped.length;
    const paged = mapped.slice(skip, skip + limit);

    return {
      data: paged,
      total,
      currentPage: page,
      lastPage: Math.max(1, Math.ceil(total / limit)),
    };
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = {
    created_at: "desc",
  };

  if (query.sort === "termurah") {
    orderBy = { harga_terendah_bekas: "asc" };
  } else if (query.sort === "termahal") {
    orderBy = { harga_terendah_bekas: "desc" };
  } else if (query.sort === "brand_asc") {
    orderBy = { brand: { nama_brand: "asc" } };
  } else if (query.sort === "brand_desc") {
    orderBy = { brand: { nama_brand: "desc" } };
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products.map(mapProductRecord),
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

  if (existing) {
    return updateProduct(Number(existing.id), payload);
  }

  return createProduct(payload);
}
