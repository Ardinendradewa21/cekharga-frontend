import { createSlug } from "@/server/utils/slug";
import { productMutationSchema, type ProductMutationInput } from "@/server/validation/product";

// Ambil nilai dari FormData dalam bentuk string yang sudah di-trim.
function getFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.trim();
}

// Konversi field teks opsional: "" -> null.
function getOptionalText(formData: FormData, key: string): string | null {
  const value = getFormValue(formData, key);
  return value.length > 0 ? value : null;
}

// Konversi angka opsional: nilai tidak valid -> null.
function getOptionalNumber(formData: FormData, key: string): number | null {
  const value = getFormValue(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Khusus integer (contoh: skor, tahun, id).
function getOptionalInteger(formData: FormData, key: string): number | null {
  const parsed = getOptionalNumber(formData, key);
  if (parsed === null) return null;
  return Number.isInteger(parsed) ? parsed : Math.trunc(parsed);
}

// Parsing checkbox/switch dari form HTML.
function getBoolean(formData: FormData, key: string): boolean {
  const value = getFormValue(formData, key).toLowerCase();
  return value === "on" || value === "1" || value === "true" || value === "yes";
}

// Editor marketplace/review mengirim JSON string.
// Helper ini memastikan bentuknya array valid.
function parseJsonArray<T>(raw: string, key: string): T[] {
  if (!raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error(`Field ${key} harus berupa array JSON.`);
    }
    return parsed as T[];
  } catch {
    throw new Error(`Field ${key} wajib JSON array valid.`);
  }
}

type ParsedVariantPriceInput = {
  marketplace_id?: number | null;
  nama_marketplace?: string | null;
  marketplace_logo?: string | null;
  seller_name?: string | null;
  price?: number | null;
  affiliate_url?: string | null;
  kondisi?: string | null;
  status_aktif?: boolean | null;
};

type ParsedVariantInput = {
  label?: string | null;
  warna?: string | null;
  sku?: string | null;
  is_default?: boolean | null;
  status_aktif?: boolean | null;
  prices?: ParsedVariantPriceInput[] | null;
};

function flattenVariantPricesToMarketplaceLinks(variants: ParsedVariantInput[]) {
  return variants.flatMap((variant) =>
    (variant.prices ?? [])
      .map((price) => {
        const hasAnyValue = Boolean(
          (price.nama_marketplace ?? "").trim() ||
            (price.seller_name ?? "").trim() ||
            price.price !== null ||
            (price.affiliate_url ?? "").trim(),
        );

        if (!hasAnyValue) return null;

        return {
          marketplace_id: price.marketplace_id ?? null,
          nama_marketplace: (price.nama_marketplace ?? "").trim(),
          marketplace_logo: (price.marketplace_logo ?? "").trim() || null,
          nama_toko: (price.seller_name ?? "").trim() || null,
          harga: price.price ?? null,
          url_produk: (price.affiliate_url ?? "").trim(),
          kondisi: (price.kondisi ?? "baru").trim() || "baru",
          status_aktif: Boolean(price.status_aktif ?? true),
          // Simpan hint varian supaya legacy consumer tetap bisa dilacak ke label asalnya jika dibutuhkan.
          variant_label: (variant.label ?? "").trim() || null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
  );
}

export function parseProductFormData(formData: FormData): ProductMutationInput {
  const namaProduk = getFormValue(formData, "nama_produk");
  const providedSlug = getFormValue(formData, "slug");
  const idBrand = getOptionalInteger(formData, "id_brand");
  const parsedVariants = parseJsonArray<ParsedVariantInput>(getFormValue(formData, "variants_json"), "variants_json");
  const legacyMarketplaceLinks = parseJsonArray(getFormValue(formData, "marketplace_links_json"), "marketplace_links_json");
  const derivedMarketplaceLinks =
    parsedVariants.length > 0 ? flattenVariantPricesToMarketplaceLinks(parsedVariants) : legacyMarketplaceLinks;
  const derivedVariantInternal =
    parsedVariants.length > 0
      ? parsedVariants
          .map((variant) => (variant.label ?? "").trim())
          .filter((label) => label.length > 0)
      : getOptionalText(formData, "varian_internal");

  // Satukan semua field form menjadi satu object payload.
  // Bagian ini sengaja eksplisit supaya mapping DB mudah ditelusuri.
  const rawPayload = {
    nama_produk: namaProduk,
    slug: createSlug(providedSlug || namaProduk),
    id_brand: idBrand ?? 0,
    brand_logo: getOptionalText(formData, "brand_logo"),
    foto: getOptionalText(formData, "foto"),
    tahun_rilis: getOptionalInteger(formData, "tahun_rilis"),
    harga_terendah_baru: getOptionalNumber(formData, "harga_terendah_baru"),
    harga_terendah_bekas: getOptionalNumber(formData, "harga_terendah_bekas"),
    status: getFormValue(formData, "status") || "aktif",
    jumlah_dilihat: getOptionalInteger(formData, "jumlah_dilihat") ?? 0,
    spesifikasi: {
      teknologi_jaringan: getOptionalText(formData, "teknologi_jaringan"),
      tanggal_rilis: getOptionalText(formData, "tanggal_rilis"),
      dimensi: getOptionalText(formData, "dimensi"),
      berat: getOptionalText(formData, "berat"),
      rating_ip: getOptionalText(formData, "rating_ip"),
      tipe_layar: getOptionalText(formData, "tipe_layar"),
      ukuran_layar: getOptionalNumber(formData, "ukuran_layar"),
      resolusi: getOptionalText(formData, "resolusi"),
      proteksi_layar: getOptionalText(formData, "proteksi_layar"),
      os: getOptionalText(formData, "os"),
      chipset: getOptionalText(formData, "chipset"),
      ada_slot_memori: getBoolean(formData, "ada_slot_memori"),
      varian_internal: derivedVariantInternal,
      tipe_memori: getOptionalText(formData, "tipe_memori"),
      kamera_utama_mp: getOptionalInteger(formData, "kamera_utama_mp"),
      detail_kamera_utama: getOptionalText(formData, "detail_kamera_utama"),
      kamera_utama_video: getOptionalText(formData, "kamera_utama_video"),
      video_kamera_utama: getOptionalText(formData, "video_kamera_utama"),
      kamera_selfie_mp: getOptionalInteger(formData, "kamera_selfie_mp"),
      kamera_selfie_video: getOptionalText(formData, "kamera_selfie_video"),
      detail_kamera_selfie: getOptionalText(formData, "detail_kamera_selfie"),
      ada_nfc: getBoolean(formData, "ada_nfc"),
      ada_jack_audio: getBoolean(formData, "ada_jack_audio"),
      kapasitas_baterai: getOptionalInteger(formData, "kapasitas_baterai"),
      kecepatan_cas: getOptionalText(formData, "kecepatan_cas"),
      sensor: getOptionalText(formData, "sensor"),
      skor_antutu: getOptionalInteger(formData, "skor_antutu"),
      skor_geekbench: getOptionalInteger(formData, "skor_geekbench"),
      skor_dxomark: getOptionalInteger(formData, "skor_dxomark"),
      bintang_performa: getOptionalInteger(formData, "bintang_performa") ?? 0,
      bintang_kamera: getOptionalInteger(formData, "bintang_kamera") ?? 0,
      bintang_baterai: getOptionalInteger(formData, "bintang_baterai") ?? 0,
      kesimpulan_singkat: getOptionalText(formData, "kesimpulan_singkat"),
      sound_loudspeaker: getOptionalText(formData, "sound_loudspeaker"),
      sound_jack: getOptionalText(formData, "sound_jack"),
      comms_wlan: getOptionalText(formData, "comms_wlan"),
      comms_bluetooth: getOptionalText(formData, "comms_bluetooth"),
      comms_gps: getOptionalText(formData, "comms_gps"),
      comms_usb: getOptionalText(formData, "comms_usb"),
    },
    marketplace_links: derivedMarketplaceLinks,
    variants: parsedVariants,
    reviews: parseJsonArray(getFormValue(formData, "reviews_json"), "reviews_json"),
  };

  // Validasi akhir dengan schema terpusat agar server action menerima data bersih.
  const parsed = productMutationSchema.safeParse(rawPayload);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Input produk tidak valid.");
  }

  return parsed.data;
}
