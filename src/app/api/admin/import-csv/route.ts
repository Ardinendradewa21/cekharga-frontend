import { jsonError, jsonSuccess } from "@/server/api/response";
import { requireAdminSession } from "@/server/auth/admin";
import { parseGsmarenaHtml } from "@/server/scraper/gsmarena";
import { createSlug } from "@/server/utils/slug";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 120;

type CsvRow = {
  nama_produk: string;
  brand_slug: string;
  gsmarena_url?: string;
  status?: string;
};

type ImportRowResult = {
  row: number;
  nama_produk: string;
  status: "ok" | "skip" | "error";
  message: string;
};

/**
 * Parse CSV sederhana. Baris pertama = header.
 * Kolom yang didukung: nama_produk, brand_slug, gsmarena_url, status
 */
function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = (lines[0] ?? "").split(",").map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));

  return lines.slice(1).map((line) => {
    // Handle quoted values with commas inside
    const values: string[] = [];
    let current = "";
    let inQuote = false;
    for (const char of line) {
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === "," && !inQuote) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = (values[i] ?? "").replace(/^["']|["']$/g, "").trim();
    });

    return {
      nama_produk: row.nama_produk ?? "",
      brand_slug: row.brand_slug ?? "",
      gsmarena_url: row.gsmarena_url || undefined,
      status: row.status || undefined,
    };
  });
}

async function fetchGsmarenaSpec(url: string): Promise<ReturnType<typeof parseGsmarenaHtml> | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return parseGsmarenaHtml(html);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session?.user) {
    return jsonError("Unauthorized admin.", 401);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("File CSV tidak ditemukan.", 400);
    }

    if (!file.name.endsWith(".csv")) {
      return jsonError("File harus berekstensi .csv.", 400);
    }

    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length === 0) {
      return jsonError("CSV kosong atau format header tidak valid.", 400);
    }

    if (rows.length > 100) {
      return jsonError("Maksimal 100 baris per import.", 400);
    }

    // Cache brand slugs ke map agar tidak query DB berulang
    const brandCache = new Map<string, bigint>();
    const allBrands = await prisma.brand.findMany({ select: { id: true, slug: true } });
    for (const b of allBrands) {
      brandCache.set(b.slug, b.id);
    }

    // Pre-fetch semua slug yang sudah ada untuk menghindari N+1 query di dalam loop
    const validSlugs = rows
      .filter((r) => r.nama_produk && r.brand_slug)
      .map((r) => createSlug(r.nama_produk));
    const existingSlugs = new Set(
      (await prisma.product.findMany({ where: { slug: { in: validSlugs } }, select: { slug: true } }))
        .map((p) => p.slug),
    );

    const results: ImportRowResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const rowNum = i + 2; // +2: baris 1 adalah header

      if (!row.nama_produk) {
        results.push({ row: rowNum, nama_produk: "-", status: "skip", message: "nama_produk kosong." });
        continue;
      }

      if (!row.brand_slug) {
        results.push({ row: rowNum, nama_produk: row.nama_produk, status: "skip", message: "brand_slug kosong." });
        continue;
      }

      const brandId = brandCache.get(row.brand_slug);
      if (!brandId) {
        results.push({ row: rowNum, nama_produk: row.nama_produk, status: "error", message: `Brand '${row.brand_slug}' tidak ditemukan.` });
        continue;
      }

      // Cek apakah produk dengan nama sama sudah ada (skip duplicate)
      const slug = createSlug(row.nama_produk);
      if (existingSlugs.has(slug)) {
        results.push({ row: rowNum, nama_produk: row.nama_produk, status: "skip", message: `Produk dengan slug '${slug}' sudah ada.` });
        continue;
      }

      try {
        // Fetch spesifikasi dari GSMArena jika URL disertakan
        let specFields: Record<string, string | number | boolean | null> = {};
        if (row.gsmarena_url) {
          const gsmarenaResult = await fetchGsmarenaSpec(row.gsmarena_url);
          if (gsmarenaResult) {
            specFields = gsmarenaResult.fields;
          }
        }

        const statusValue = row.status === "aktif" ? "aktif" : "draft";

        await prisma.$transaction(async (tx) => {
          const product = await tx.product.create({
            data: {
              nama_produk: row.nama_produk,
              slug,
              id_brand: brandId,
              tahun_rilis: typeof specFields.tahun_rilis === "number" ? specFields.tahun_rilis : null,
              status: statusValue as "aktif" | "draft",
              foto: null,
              created_at: new Date(),
              updated_at: new Date(),
            },
          });

          // Buat entri spesifikasi jika ada data dari GSMArena
          if (Object.keys(specFields).length > 0) {
            const tanggalRilis = typeof specFields.tanggal_rilis === "string" && specFields.tanggal_rilis
              ? new Date(specFields.tanggal_rilis)
              : null;

            await tx.specification.create({
              data: {
                id_produk: product.id,
                teknologi_jaringan: typeof specFields.teknologi_jaringan === "string" ? specFields.teknologi_jaringan : null,
                tanggal_rilis: tanggalRilis,
                dimensi: typeof specFields.dimensi === "string" ? specFields.dimensi : null,
                berat: typeof specFields.berat === "string" ? specFields.berat : null,
                rating_ip: typeof specFields.rating_ip === "string" ? specFields.rating_ip : null,
                tipe_layar: typeof specFields.tipe_layar === "string" ? specFields.tipe_layar : null,
                ukuran_layar: typeof specFields.ukuran_layar === "number" ? specFields.ukuran_layar : null,
                resolusi: typeof specFields.resolusi === "string" ? specFields.resolusi : null,
                proteksi_layar: typeof specFields.proteksi_layar === "string" ? specFields.proteksi_layar : null,
                os: typeof specFields.os === "string" ? specFields.os : null,
                chipset: typeof specFields.chipset === "string" ? specFields.chipset : null,
                ada_slot_memori: typeof specFields.ada_slot_memori === "boolean" ? specFields.ada_slot_memori : false,
                kamera_utama_mp: typeof specFields.kamera_utama_mp === "number" ? specFields.kamera_utama_mp : null,
                detail_kamera_utama: typeof specFields.detail_kamera_utama === "string" ? specFields.detail_kamera_utama : null,
                kamera_utama_video: typeof specFields.kamera_utama_video === "string" ? specFields.kamera_utama_video : null,
                kamera_selfie_mp: typeof specFields.kamera_selfie_mp === "number" ? specFields.kamera_selfie_mp : null,
                detail_kamera_selfie: typeof specFields.detail_kamera_selfie === "string" ? specFields.detail_kamera_selfie : null,
                kamera_selfie_video: typeof specFields.kamera_selfie_video === "string" ? specFields.kamera_selfie_video : null,
                ada_nfc: typeof specFields.ada_nfc === "boolean" ? specFields.ada_nfc : false,
                ada_jack_audio: typeof specFields.ada_jack_audio === "boolean" ? specFields.ada_jack_audio : false,
                kapasitas_baterai: typeof specFields.kapasitas_baterai === "number" ? specFields.kapasitas_baterai : null,
                kecepatan_cas: typeof specFields.kecepatan_cas === "string" ? specFields.kecepatan_cas : null,
                sensor: typeof specFields.sensor === "string" ? specFields.sensor : null,
                comms_wlan: typeof specFields.comms_wlan === "string" ? specFields.comms_wlan : null,
                comms_bluetooth: typeof specFields.comms_bluetooth === "string" ? specFields.comms_bluetooth : null,
                comms_gps: typeof specFields.comms_gps === "string" ? specFields.comms_gps : null,
                comms_usb: typeof specFields.comms_usb === "string" ? specFields.comms_usb : null,
                sound_loudspeaker: typeof specFields.sound_loudspeaker === "string" ? specFields.sound_loudspeaker : null,
                sound_jack: typeof specFields.sound_jack === "string" ? specFields.sound_jack : null,
                created_at: new Date(),
                updated_at: new Date(),
              },
            });
          }
        });

        results.push({ row: rowNum, nama_produk: row.nama_produk, status: "ok", message: `Berhasil dibuat sebagai '${statusValue}'.` });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error.";
        results.push({ row: rowNum, nama_produk: row.nama_produk, status: "error", message: msg });
      }
    }

    let okCount = 0, errorCount = 0, skipCount = 0;
    for (const r of results) {
      if (r.status === "ok") okCount++;
      else if (r.status === "error") errorCount++;
      else skipCount++;
    }

    return jsonSuccess(
      { results, summary: { ok: okCount, error: errorCount, skip: skipCount } },
      `Import selesai: ${okCount} berhasil, ${skipCount} dilewati, ${errorCount} error.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return jsonError(`Gagal memproses CSV: ${message}`, 500);
  }
}
