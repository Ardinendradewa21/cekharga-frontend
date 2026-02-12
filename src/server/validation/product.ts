import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) return null;
    return value.length > 0 ? value : null;
  });

export const specificationInputSchema = z.object({
  teknologi_jaringan: optionalText,
  tanggal_rilis: optionalText,
  dimensi: optionalText,
  berat: optionalText,
  rating_ip: optionalText,
  tipe_layar: optionalText,
  ukuran_layar: z.number().positive().optional().nullable(),
  resolusi: optionalText,
  proteksi_layar: optionalText,
  os: optionalText,
  chipset: optionalText,
  ada_slot_memori: z.boolean().optional().default(false),
  varian_internal: z.union([z.string(), z.array(z.string()), z.record(z.string(), z.any())]).optional().nullable(),
  tipe_memori: optionalText,
  kamera_utama_mp: z.number().int().nonnegative().optional().nullable(),
  detail_kamera_utama: optionalText,
  kamera_utama_video: optionalText,
  video_kamera_utama: optionalText,
  kamera_selfie_mp: z.number().int().nonnegative().optional().nullable(),
  kamera_selfie_video: optionalText,
  detail_kamera_selfie: optionalText,
  ada_nfc: z.boolean().optional().default(false),
  ada_jack_audio: z.boolean().optional().default(false),
  kapasitas_baterai: z.number().int().nonnegative().optional().nullable(),
  kecepatan_cas: optionalText,
  sensor: optionalText,
  skor_antutu: z.number().int().nonnegative().optional().nullable(),
  skor_geekbench: z.number().int().nonnegative().optional().nullable(),
  skor_dxomark: z.number().int().nonnegative().optional().nullable(),
  bintang_performa: z.number().int().min(0).max(10).optional().default(0),
  bintang_kamera: z.number().int().min(0).max(10).optional().default(0),
  bintang_baterai: z.number().int().min(0).max(10).optional().default(0),
  kesimpulan_singkat: optionalText,
  sound_loudspeaker: optionalText,
  sound_jack: optionalText,
  comms_wlan: optionalText,
  comms_bluetooth: optionalText,
  comms_gps: optionalText,
  comms_usb: optionalText,
});

export const marketplaceLinkInputSchema = z.object({
  marketplace_id: z.number().int().positive().optional().nullable(),
  nama_marketplace: z.string().trim().min(1).max(255),
  marketplace_logo: optionalText,
  nama_toko: optionalText,
  harga: z.number().nonnegative(),
  url_produk: z.string().trim().url(),
  kondisi: z.string().trim().min(1).max(255).default("baru"),
  status_aktif: z.boolean().default(true),
});

export const reviewInputSchema = z.object({
  reviewer_name: z.string().trim().min(1).max(255),
  platform: z.string().trim().min(1).max(50),
  video_url: z.string().trim().url(),
  highlight_quote: optionalText,
});

export const productMutationSchema = z.object({
  nama_produk: z.string().trim().min(2).max(255),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(255)
    .regex(/^[a-z0-9-]+$/, "Slug hanya boleh huruf kecil, angka, dan '-'"),
  id_brand: z.number().int().positive(),
  brand_logo: optionalText,
  foto: optionalText,
  tahun_rilis: z.number().int().min(1990).max(2100).optional().nullable(),
  harga_terendah_baru: z.number().nonnegative().optional().nullable(),
  harga_terendah_bekas: z.number().nonnegative().optional().nullable(),
  status: z.enum(["aktif", "draft"]).default("aktif"),
  jumlah_dilihat: z.number().int().nonnegative().default(0),
  spesifikasi: specificationInputSchema.optional(),
  marketplace_links: z.array(marketplaceLinkInputSchema).default([]),
  reviews: z.array(reviewInputSchema).default([]),
});

export const scraperIngestSchema = z
  .object({
    nama_produk: z.string().trim().min(2).max(255),
    slug: z.string().trim().min(2).max(255).optional(),
    id_brand: z.number().int().positive().optional(),
    brand_slug: z.string().trim().min(1).max(255).optional(),
    brand_name: z.string().trim().min(1).max(255).optional(),
    brand_logo: optionalText,
    foto: optionalText,
    tahun_rilis: z.number().int().min(1990).max(2100).optional().nullable(),
    harga_terendah_baru: z.number().nonnegative().optional().nullable(),
    harga_terendah_bekas: z.number().nonnegative().optional().nullable(),
    spesifikasi: specificationInputSchema.optional(),
    marketplace_links: z.array(marketplaceLinkInputSchema).default([]),
    reviews: z.array(reviewInputSchema).default([]),
  })
  .refine((value) => Boolean(value.id_brand || value.brand_slug || value.brand_name), {
    message: "Sertakan salah satu dari id_brand, brand_slug, atau brand_name.",
    path: ["id_brand"],
  });

export type ProductMutationInput = z.infer<typeof productMutationSchema>;
export type ScraperIngestInput = z.infer<typeof scraperIngestSchema>;
