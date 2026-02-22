import bcrypt from "bcryptjs";
import { Prisma, PrismaClient, ProductStatus } from "@prisma/client";

const prisma = new PrismaClient();

type SeedBrand = {
  nama_brand: string;
  slug: string;
  logo: string | null;
};

type SeedMarketplace = {
  nama: string;
  slug: string;
  logo: string | null;
  warna_hex: string;
  text_color: string;
};

type SeedSpecification = {
  teknologi_jaringan?: string | null;
  tanggal_rilis?: string | null;
  dimensi?: string | null;
  berat?: string | null;
  rating_ip?: string | null;
  tipe_layar?: string | null;
  ukuran_layar?: number | null;
  resolusi?: string | null;
  proteksi_layar?: string | null;
  os?: string | null;
  chipset?: string | null;
  ada_slot_memori?: boolean;
  varian_internal?: Prisma.InputJsonValue | null;
  tipe_memori?: string | null;
  kamera_utama_mp?: number | null;
  detail_kamera_utama?: string | null;
  kamera_utama_video?: string | null;
  video_kamera_utama?: string | null;
  kamera_selfie_mp?: number | null;
  kamera_selfie_video?: string | null;
  detail_kamera_selfie?: string | null;
  ada_nfc?: boolean;
  ada_jack_audio?: boolean;
  kapasitas_baterai?: number | null;
  kecepatan_cas?: string | null;
  sensor?: string | null;
  skor_antutu?: number | null;
  skor_geekbench?: number | null;
  skor_dxomark?: number | null;
  bintang_performa?: number;
  bintang_kamera?: number;
  bintang_baterai?: number;
  kesimpulan_singkat?: string | null;
  sound_loudspeaker?: string | null;
  sound_jack?: string | null;
  comms_wlan?: string | null;
  comms_bluetooth?: string | null;
  comms_gps?: string | null;
  comms_usb?: string | null;
};

type SeedMarketplaceLink = {
  marketplace_slug: string;
  nama_toko: string | null;
  harga: number;
  url_produk: string;
  kondisi: string;
  status_aktif: boolean;
};

type SeedReview = {
  reviewer_name: string;
  platform: string;
  video_url: string;
  highlight_quote: string | null;
};

type SeedProduct = {
  nama_produk: string;
  slug: string;
  foto: string | null;
  brand_slug: string;
  tahun_rilis: number | null;
  harga_terendah_baru: number | null;
  harga_terendah_bekas: number | null;
  status: ProductStatus;
  jumlah_dilihat: number;
  spesifikasi: SeedSpecification | null;
  marketplace_links: SeedMarketplaceLink[];
  reviews: SeedReview[];
};

const brandSeeds: SeedBrand[] = [
  { nama_brand: "Apple", slug: "apple", logo: null },
  { nama_brand: "Samsung", slug: "samsung", logo: null },
  { nama_brand: "Xiaomi", slug: "xiaomi", logo: null },
];

const marketplaceSeeds: SeedMarketplace[] = [
  {
    nama: "Shopee",
    slug: "shopee",
    logo: null,
    warna_hex: "#EE4D2D",
    text_color: "#FFFFFF",
  },
  {
    nama: "Tokopedia",
    slug: "tokopedia",
    logo: null,
    warna_hex: "#03AC0E",
    text_color: "#FFFFFF",
  },
  {
    nama: "Blibli",
    slug: "blibli",
    logo: null,
    warna_hex: "#0095DA",
    text_color: "#FFFFFF",
  },
];

const productSeeds: SeedProduct[] = [
  {
    nama_produk: "iPhone 15 128GB",
    slug: "iphone-15-128gb",
    foto: "https://www.apple.com/newsroom/images/2023/09/apple-introduces-iphone-15-and-iphone-15-plus/article/Apple-iPhone-15-lineup-hero-230912_Full-Bleed-Image.jpg.large.jpg",
    brand_slug: "apple",
    tahun_rilis: 2023,
    harga_terendah_baru: 14999000,
    harga_terendah_bekas: 11700000,
    status: ProductStatus.aktif,
    jumlah_dilihat: 0,
    spesifikasi: {
      teknologi_jaringan: "GSM / HSPA / LTE / 5G",
      tanggal_rilis: "2023-09-22",
      dimensi: "147.6 x 71.6 x 7.8 mm",
      berat: "171 g",
      rating_ip: "IP68",
      tipe_layar: "Super Retina XDR OLED",
      ukuran_layar: 6.1,
      resolusi: "1179 x 2556 pixels",
      proteksi_layar: "Ceramic Shield glass",
      os: "iOS 17",
      chipset: "Apple A16 Bionic",
      ada_slot_memori: false,
      varian_internal: ["128GB", "256GB", "512GB"],
      tipe_memori: "NVMe",
      kamera_utama_mp: 48,
      detail_kamera_utama: "48 MP (wide) + 12 MP (ultrawide)",
      kamera_utama_video: "4K@24/25/30/60fps",
      video_kamera_utama: "Dolby Vision HDR",
      kamera_selfie_mp: 12,
      kamera_selfie_video: "4K@24/25/30/60fps",
      detail_kamera_selfie: "12 MP + SL 3D",
      ada_nfc: true,
      ada_jack_audio: false,
      kapasitas_baterai: 3349,
      kecepatan_cas: "20W wired, 15W MagSafe",
      sensor: "Face ID, accelerometer, gyro, proximity, compass, barometer",
      skor_antutu: 1465000,
      skor_geekbench: 6460,
      skor_dxomark: 145,
      bintang_performa: 9,
      bintang_kamera: 9,
      bintang_baterai: 8,
      kesimpulan_singkat: "Flagship ringkas dengan performa kencang dan kamera stabil.",
      sound_loudspeaker: "Stereo speakers",
      sound_jack: "Tidak ada",
      comms_wlan: "Wi-Fi 802.11 a/b/g/n/ac/6",
      comms_bluetooth: "5.3, A2DP, LE",
      comms_gps: "GPS, GLONASS, GALILEO, BDS, QZSS, NavIC",
      comms_usb: "USB Type-C 2.0",
    },
    marketplace_links: [
      {
        marketplace_slug: "shopee",
        nama_toko: "iBox Official",
        harga: 14999000,
        url_produk: "https://shopee.co.id/search?keyword=iphone%2015%20128gb",
        kondisi: "baru",
        status_aktif: true,
      },
      {
        marketplace_slug: "tokopedia",
        nama_toko: "Erafone Official",
        harga: 14899000,
        url_produk: "https://www.tokopedia.com/search?q=iphone%2015%20128gb",
        kondisi: "baru",
        status_aktif: true,
      },
      {
        marketplace_slug: "blibli",
        nama_toko: "Digimap Official",
        harga: 15099000,
        url_produk: "https://www.blibli.com/jual/iphone-15-128gb",
        kondisi: "baru",
        status_aktif: true,
      },
    ],
    reviews: [
      {
        reviewer_name: "MKBHD",
        platform: "YouTube",
        video_url: "https://www.youtube.com/watch?v=xqyUdNxWazA",
        highlight_quote: "USB-C finally arrives with polished day-to-day experience.",
      },
      {
        reviewer_name: "GadgetIn",
        platform: "YouTube",
        video_url: "https://www.youtube.com/watch?v=YzjQhXXS4mI",
        highlight_quote: "Kamera konsisten dan nyaman dipakai harian.",
      },
    ],
  },
  {
    nama_produk: "Samsung Galaxy S24 8/256",
    slug: "samsung-galaxy-s24-8-256",
    foto: "https://images.samsung.com/is/image/samsung/p6pim/id/2401/gallery/id-galaxy-s24-s928-sm-s928bzkgxid-thumb-539188991",
    brand_slug: "samsung",
    tahun_rilis: 2024,
    harga_terendah_baru: 12499000,
    harga_terendah_bekas: 10200000,
    status: ProductStatus.aktif,
    jumlah_dilihat: 0,
    spesifikasi: {
      teknologi_jaringan: "GSM / HSPA / LTE / 5G",
      tanggal_rilis: "2024-01-24",
      dimensi: "147 x 70.6 x 7.6 mm",
      berat: "167 g",
      rating_ip: "IP68",
      tipe_layar: "Dynamic LTPO AMOLED 2X",
      ukuran_layar: 6.2,
      resolusi: "1080 x 2340 pixels",
      proteksi_layar: "Corning Gorilla Glass Victus 2",
      os: "Android 14, One UI",
      chipset: "Exynos 2400",
      ada_slot_memori: false,
      varian_internal: [{ ram: "8GB", storage: "128GB" }, { ram: "8GB", storage: "256GB" }],
      tipe_memori: "UFS 4.0",
      kamera_utama_mp: 50,
      detail_kamera_utama: "50 MP (wide) + 10 MP (telephoto) + 12 MP (ultrawide)",
      kamera_utama_video: "8K@24/30fps, 4K@30/60fps",
      video_kamera_utama: "HDR10+",
      kamera_selfie_mp: 12,
      kamera_selfie_video: "4K@30/60fps",
      detail_kamera_selfie: "Dual Pixel PDAF",
      ada_nfc: true,
      ada_jack_audio: false,
      kapasitas_baterai: 4000,
      kecepatan_cas: "25W wired, 15W wireless",
      sensor: "Fingerprint under display, accelerometer, gyro, proximity, compass",
      skor_antutu: 1810000,
      skor_geekbench: 7050,
      skor_dxomark: 144,
      bintang_performa: 9,
      bintang_kamera: 8,
      bintang_baterai: 7,
      kesimpulan_singkat: "Kompak, layar bagus, dan performa flagship harian.",
      sound_loudspeaker: "Stereo speakers, tuned by AKG",
      sound_jack: "Tidak ada",
      comms_wlan: "Wi-Fi 802.11 a/b/g/n/ac/6e/7",
      comms_bluetooth: "5.3, A2DP, LE",
      comms_gps: "GPS, GLONASS, BDS, GALILEO, QZSS",
      comms_usb: "USB Type-C 3.2",
    },
    marketplace_links: [
      {
        marketplace_slug: "shopee",
        nama_toko: "Samsung Official Shop",
        harga: 12499000,
        url_produk: "https://shopee.co.id/search?keyword=galaxy%20s24%20256gb",
        kondisi: "baru",
        status_aktif: true,
      },
      {
        marketplace_slug: "tokopedia",
        nama_toko: "Samsung Indonesia",
        harga: 12399000,
        url_produk: "https://www.tokopedia.com/search?q=galaxy%20s24%20256gb",
        kondisi: "baru",
        status_aktif: true,
      },
      {
        marketplace_slug: "blibli",
        nama_toko: "Samsung Official Store",
        harga: 12599000,
        url_produk: "https://www.blibli.com/jual/samsung-galaxy-s24",
        kondisi: "baru",
        status_aktif: true,
      },
    ],
    reviews: [
      {
        reviewer_name: "GSMArena",
        platform: "YouTube",
        video_url: "https://www.youtube.com/watch?v=V2L0I6uW8w8",
        highlight_quote: "Compact flagship with strong display and camera consistency.",
      },
      {
        reviewer_name: "Dave2D",
        platform: "YouTube",
        video_url: "https://www.youtube.com/watch?v=W2Q8NQ4hR8M",
        highlight_quote: "A practical premium phone for everyday use.",
      },
    ],
  },
  {
    nama_produk: "Xiaomi Redmi Note 13 Pro 5G 12/512",
    slug: "xiaomi-redmi-note-13-pro-5g-12-512",
    foto: "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-note-13-pro-5g/pc/overview/1f39f4d7f053f3f1dc5fdb53f4cc04e1.png",
    brand_slug: "xiaomi",
    tahun_rilis: 2024,
    harga_terendah_baru: 4899000,
    harga_terendah_bekas: 3950000,
    status: ProductStatus.aktif,
    jumlah_dilihat: 0,
    spesifikasi: {
      teknologi_jaringan: "GSM / HSPA / LTE / 5G",
      tanggal_rilis: "2024-01-15",
      dimensi: "161.2 x 74.3 x 8 mm",
      berat: "187 g",
      rating_ip: "IP54",
      tipe_layar: "AMOLED, 120Hz",
      ukuran_layar: 6.67,
      resolusi: "1220 x 2712 pixels",
      proteksi_layar: "Corning Gorilla Glass Victus",
      os: "Android 13, HyperOS",
      chipset: "Snapdragon 7s Gen 2",
      ada_slot_memori: false,
      varian_internal: [{ ram: "8GB", storage: "256GB" }, { ram: "12GB", storage: "512GB" }],
      tipe_memori: "UFS 2.2",
      kamera_utama_mp: 200,
      detail_kamera_utama: "200 MP (wide) + 8 MP (ultrawide) + 2 MP (macro)",
      kamera_utama_video: "4K@30fps, 1080p@30/60fps",
      video_kamera_utama: "gyro-EIS",
      kamera_selfie_mp: 16,
      kamera_selfie_video: "1080p@30/60fps",
      detail_kamera_selfie: "PDAF",
      ada_nfc: true,
      ada_jack_audio: true,
      kapasitas_baterai: 5100,
      kecepatan_cas: "67W wired",
      sensor: "Fingerprint under display, accelerometer, gyro, compass",
      skor_antutu: 640000,
      skor_geekbench: 2980,
      skor_dxomark: 123,
      bintang_performa: 7,
      bintang_kamera: 8,
      bintang_baterai: 8,
      kesimpulan_singkat: "Value for money untuk kamera besar dan baterai awet.",
      sound_loudspeaker: "Stereo speakers",
      sound_jack: "Ada, 3.5mm",
      comms_wlan: "Wi-Fi 802.11 a/b/g/n/ac",
      comms_bluetooth: "5.2, A2DP, LE",
      comms_gps: "GPS, GLONASS, GALILEO, BDS, QZSS",
      comms_usb: "USB Type-C 2.0",
    },
    marketplace_links: [
      {
        marketplace_slug: "shopee",
        nama_toko: "Xiaomi Official Store",
        harga: 4899000,
        url_produk: "https://shopee.co.id/search?keyword=redmi%20note%2013%20pro%205g",
        kondisi: "baru",
        status_aktif: true,
      },
      {
        marketplace_slug: "tokopedia",
        nama_toko: "Xiaomi Official",
        harga: 4849000,
        url_produk: "https://www.tokopedia.com/search?q=redmi%20note%2013%20pro%205g",
        kondisi: "baru",
        status_aktif: true,
      },
      {
        marketplace_slug: "blibli",
        nama_toko: "Xiaomi Authorized",
        harga: 4929000,
        url_produk: "https://www.blibli.com/jual/redmi-note-13-pro-5g",
        kondisi: "baru",
        status_aktif: true,
      },
    ],
    reviews: [
      {
        reviewer_name: "Sobat HAPE",
        platform: "YouTube",
        video_url: "https://www.youtube.com/watch?v=G8Z6vNf3fI8",
        highlight_quote: "Kamera 200MP dan layar bagus di kelas menengah.",
      },
      {
        reviewer_name: "Jagat Review",
        platform: "YouTube",
        video_url: "https://www.youtube.com/watch?v=UAcYQH4yl9k",
        highlight_quote: "Performa seimbang untuk penggunaan harian dan gaming casual.",
      },
    ],
  },
];

function parseAdminEmails(raw: string | undefined): string[] {
  const emails = (raw ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set(emails)];
}

function createDisplayNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? "admin";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildSpecificationData(
  productId: bigint,
  specification: SeedSpecification,
  now: Date,
): Prisma.SpecificationUncheckedCreateInput {
  const payload: Prisma.SpecificationUncheckedCreateInput = {
    id_produk: productId,
    teknologi_jaringan: specification.teknologi_jaringan ?? null,
    tanggal_rilis: parseDateOnly(specification.tanggal_rilis),
    dimensi: specification.dimensi ?? null,
    berat: specification.berat ?? null,
    rating_ip: specification.rating_ip ?? null,
    tipe_layar: specification.tipe_layar ?? null,
    ukuran_layar: specification.ukuran_layar ?? null,
    resolusi: specification.resolusi ?? null,
    proteksi_layar: specification.proteksi_layar ?? null,
    os: specification.os ?? null,
    chipset: specification.chipset ?? null,
    ada_slot_memori: specification.ada_slot_memori ?? false,
    tipe_memori: specification.tipe_memori ?? null,
    kamera_utama_mp: specification.kamera_utama_mp ?? null,
    detail_kamera_utama: specification.detail_kamera_utama ?? null,
    kamera_utama_video: specification.kamera_utama_video ?? null,
    video_kamera_utama: specification.video_kamera_utama ?? null,
    kamera_selfie_mp: specification.kamera_selfie_mp ?? null,
    kamera_selfie_video: specification.kamera_selfie_video ?? null,
    detail_kamera_selfie: specification.detail_kamera_selfie ?? null,
    ada_nfc: specification.ada_nfc ?? false,
    ada_jack_audio: specification.ada_jack_audio ?? false,
    kapasitas_baterai: specification.kapasitas_baterai ?? null,
    kecepatan_cas: specification.kecepatan_cas ?? null,
    sensor: specification.sensor ?? null,
    skor_antutu: specification.skor_antutu ?? null,
    skor_geekbench: specification.skor_geekbench ?? null,
    skor_dxomark: specification.skor_dxomark ?? null,
    bintang_performa: specification.bintang_performa ?? 0,
    bintang_kamera: specification.bintang_kamera ?? 0,
    bintang_baterai: specification.bintang_baterai ?? 0,
    kesimpulan_singkat: specification.kesimpulan_singkat ?? null,
    sound_loudspeaker: specification.sound_loudspeaker ?? null,
    sound_jack: specification.sound_jack ?? null,
    comms_wlan: specification.comms_wlan ?? null,
    comms_bluetooth: specification.comms_bluetooth ?? null,
    comms_gps: specification.comms_gps ?? null,
    comms_usb: specification.comms_usb ?? null,
    created_at: now,
    updated_at: now,
  };

  if (specification.varian_internal !== null && specification.varian_internal !== undefined) {
    payload.varian_internal = specification.varian_internal;
  }

  return payload;
}

async function seedAdminUsers(now: Date) {
  const fallbackEmail = "admin@sinteniki.com";
  const emails = parseAdminEmails(process.env.ADMIN_EMAILS);
  const adminEmails = emails.length > 0 ? emails : [fallbackEmail];
  const seedPassword = process.env.SEED_ADMIN_PASSWORD?.trim() || "admin12345";
  const hashedPassword = await bcrypt.hash(seedPassword, 10);

  let createdCount = 0;

  for (const email of adminEmails) {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: createDisplayNameFromEmail(email),
          updated_at: now,
        },
      });
      continue;
    }

    await prisma.user.create({
      data: {
        name: createDisplayNameFromEmail(email),
        email,
        email_verified_at: now,
        password: hashedPassword,
        remember_token: null,
        created_at: now,
        updated_at: now,
      },
    });

    createdCount += 1;
  }

  return { adminEmails, createdCount, seedPassword };
}

async function seedBrands(now: Date) {
  const brandIdBySlug = new Map<string, bigint>();

  for (const brand of brandSeeds) {
    const result = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {
        nama_brand: brand.nama_brand,
        logo: brand.logo,
        updated_at: now,
      },
      create: {
        nama_brand: brand.nama_brand,
        slug: brand.slug,
        logo: brand.logo,
        created_at: now,
        updated_at: now,
      },
      select: {
        id: true,
        slug: true,
      },
    });

    brandIdBySlug.set(result.slug, result.id);
  }

  return brandIdBySlug;
}

async function seedMarketplaces(now: Date) {
  const marketplaceBySlug = new Map<string, { id: bigint; nama: string }>();

  for (const marketplace of marketplaceSeeds) {
    const existing = await prisma.marketplace.findFirst({
      where: {
        OR: [{ slug: marketplace.slug }, { nama: { equals: marketplace.nama, mode: "insensitive" } }],
      },
      select: { id: true },
    });

    if (existing) {
      const updated = await prisma.marketplace.update({
        where: { id: existing.id },
        data: {
          nama: marketplace.nama,
          slug: marketplace.slug,
          logo: marketplace.logo,
          warna_hex: marketplace.warna_hex,
          text_color: marketplace.text_color,
          updated_at: now,
        },
        select: {
          id: true,
          nama: true,
          slug: true,
        },
      });

      marketplaceBySlug.set(updated.slug, { id: updated.id, nama: updated.nama });
      continue;
    }

    const created = await prisma.marketplace.create({
      data: {
        nama: marketplace.nama,
        slug: marketplace.slug,
        logo: marketplace.logo,
        warna_hex: marketplace.warna_hex,
        text_color: marketplace.text_color,
        created_at: now,
        updated_at: now,
      },
      select: {
        id: true,
        nama: true,
        slug: true,
      },
    });

    marketplaceBySlug.set(created.slug, { id: created.id, nama: created.nama });
  }

  return marketplaceBySlug;
}

async function seedProducts(
  now: Date,
  brandIdBySlug: Map<string, bigint>,
  marketplaceBySlug: Map<string, { id: bigint; nama: string }>,
) {
  for (const productSeed of productSeeds) {
    const brandId = brandIdBySlug.get(productSeed.brand_slug);
    if (!brandId) {
      throw new Error(`Brand slug tidak ditemukan: ${productSeed.brand_slug}`);
    }

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.upsert({
        where: { slug: productSeed.slug },
        update: {
          nama_produk: productSeed.nama_produk,
          foto: productSeed.foto,
          id_brand: brandId,
          tahun_rilis: productSeed.tahun_rilis,
          harga_terendah_baru: productSeed.harga_terendah_baru,
          harga_terendah_bekas: productSeed.harga_terendah_bekas,
          status: productSeed.status,
          views: productSeed.jumlah_dilihat,
          jumlah_dilihat: BigInt(productSeed.jumlah_dilihat),
          updated_at: now,
        },
        create: {
          nama_produk: productSeed.nama_produk,
          slug: productSeed.slug,
          foto: productSeed.foto,
          id_brand: brandId,
          tahun_rilis: productSeed.tahun_rilis,
          harga_terendah_baru: productSeed.harga_terendah_baru,
          harga_terendah_bekas: productSeed.harga_terendah_bekas,
          status: productSeed.status,
          views: productSeed.jumlah_dilihat,
          jumlah_dilihat: BigInt(productSeed.jumlah_dilihat),
          created_at: now,
          updated_at: now,
        },
        select: { id: true },
      });

      await tx.specification.deleteMany({ where: { id_produk: product.id } });
      await tx.marketplaceLink.deleteMany({ where: { produk_id: product.id } });
      await tx.review.deleteMany({ where: { produk_id: product.id } });

      if (productSeed.spesifikasi) {
        await tx.specification.create({
          data: buildSpecificationData(product.id, productSeed.spesifikasi, now),
        });
      }

      if (productSeed.marketplace_links.length > 0) {
        const linksData: Prisma.MarketplaceLinkCreateManyInput[] = productSeed.marketplace_links.map((link) => {
          const marketplace = marketplaceBySlug.get(link.marketplace_slug);
          if (!marketplace) {
            throw new Error(`Marketplace slug tidak ditemukan: ${link.marketplace_slug}`);
          }

          return {
            produk_id: product.id,
            marketplace_id: marketplace.id,
            nama_marketplace: marketplace.nama,
            nama_toko: link.nama_toko,
            harga: link.harga,
            url_produk: link.url_produk,
            kondisi: link.kondisi,
            status_aktif: link.status_aktif,
            created_at: now,
            updated_at: now,
          };
        });

        await tx.marketplaceLink.createMany({ data: linksData });
      }

      if (productSeed.reviews.length > 0) {
        await tx.review.createMany({
          data: productSeed.reviews.map((review) => ({
            produk_id: product.id,
            reviewer_name: review.reviewer_name,
            platform: review.platform,
            video_url: review.video_url,
            highlight_quote: review.highlight_quote,
            created_at: now,
            updated_at: now,
          })),
        });
      }
    });
  }
}

async function main() {
  const now = new Date();

  const [brandIdBySlug, marketplaceBySlug, adminResult] = await Promise.all([
    seedBrands(now),
    seedMarketplaces(now),
    seedAdminUsers(now),
  ]);

  await seedProducts(now, brandIdBySlug, marketplaceBySlug);

  console.log(`Seed selesai: ${brandSeeds.length} brand, ${marketplaceSeeds.length} marketplace, ${productSeeds.length} produk.`);

  if (adminResult.createdCount > 0) {
    console.log(`Admin baru dibuat: ${adminResult.adminEmails.join(", ")}`);
    console.log(`Password admin default (hanya untuk user baru): ${adminResult.seedPassword}`);
  } else {
    console.log(`Admin sudah ada: ${adminResult.adminEmails.join(", ")}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
