import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { AutoSlugFields } from "./AutoSlugFields";
import { BrandSelectField } from "./BrandSelectField";
import { GsmArenaAutofill } from "./GsmArenaAutofill";
import { ImageUploadField } from "./ImageUploadField";
import { MarketplaceLinksEditor } from "./MarketplaceLinksEditor";
import { ProductFormAssistant } from "./ProductFormAssistant";
import { ProductPreviewSheet } from "./ProductPreviewSheet";
import { ReviewsEditor } from "./ReviewsEditor";

// ID form dipakai lintas komponen (autofill, preview, assistant) agar bisa sinkron.
const ADMIN_PRODUCT_FORM_ID = "admin-product-form";

type BrandOption = {
  id: number;
  nama_brand: string;
  logo?: string | null;
};

type MarketplaceOption = {
  id: number;
  nama: string;
  logo?: string | null;
};

type ProductFormProps = {
  title: string;
  description: string;
  submitLabel: string;
  brands: BrandOption[];
  marketplaces: MarketplaceOption[];
  initialData?: Record<string, unknown> | null;
  action: (formData: FormData) => Promise<void>;
};

function valueOrEmpty(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function booleanToChecked(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value !== "string") return false;
  return ["1", "true", "yes", "ya", "ada"].includes(value.toLowerCase());
}

export function ProductForm({
  title,
  description,
  submitLabel,
  brands,
  marketplaces,
  initialData,
  action,
}: ProductFormProps) {
  // Normalisasi data awal (mode edit) agar field form aman dipakai sebagai defaultValue.
  const spec = (initialData?.spesifikasi as Record<string, unknown> | undefined) ?? {};
  const links = ((initialData?.marketplace_links as Record<string, unknown>[] | undefined) ?? []).map((link) => ({
    ...link,
    marketplace_logo:
      (link.marketplace_logo as string | undefined) ??
      ((link.marketplace as { logo?: string | null } | undefined)?.logo ?? ""),
  }));
  const reviews = (initialData?.reviews as Record<string, unknown>[] | undefined) ?? [];
  const initialBrandId = Number(initialData?.id_brand ?? brands[0]?.id ?? 0);
  const initialBrandLogo = valueOrEmpty((initialData?.brand as { logo?: string | null } | undefined)?.logo ?? "");
  const draftKey = initialData?.id ? `admin-product-form:edit:${String(initialData.id)}` : "admin-product-form:new";
  const autoGenerateSlug = !Boolean(initialData?.id);

  return (
    <form id={ADMIN_PRODUCT_FORM_ID} action={action} className="space-y-6">
      {/* Header ringkas: konteks halaman tambah/edit produk */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-sky-50 p-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Blok data inti produk */}
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-700">Data Produk</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <AutoSlugFields
            initialNamaProduk={valueOrEmpty(initialData?.nama_produk)}
            initialSlug={valueOrEmpty(initialData?.slug)}
            autoGenerate={autoGenerateSlug}
          />

          <BrandSelectField brands={brands} initialBrandId={initialBrandId} initialBrandLogo={initialBrandLogo} />

          <div className="space-y-2">
            <Label htmlFor="tahun_rilis">Tahun Rilis</Label>
            <Input id="tahun_rilis" name="tahun_rilis" type="number" defaultValue={valueOrEmpty(initialData?.tahun_rilis)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="harga_terendah_baru">Harga Terendah Baru</Label>
            <Input
              id="harga_terendah_baru"
              name="harga_terendah_baru"
              type="number"
              step="0.01"
              defaultValue={valueOrEmpty(initialData?.harga_terendah_baru)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="harga_terendah_bekas">Harga Terendah Bekas</Label>
            <Input
              id="harga_terendah_bekas"
              name="harga_terendah_bekas"
              type="number"
              step="0.01"
              defaultValue={valueOrEmpty(initialData?.harga_terendah_bekas)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={valueOrEmpty(initialData?.status || "aktif")}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="aktif">aktif</option>
              <option value="draft">draft</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jumlah_dilihat">Jumlah Dilihat</Label>
            <Input
              id="jumlah_dilihat"
              name="jumlah_dilihat"
              type="number"
              defaultValue={valueOrEmpty(initialData?.jumlah_dilihat ?? 0)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="foto">Foto Produk</Label>
            <ImageUploadField name="foto" initialValue={valueOrEmpty(initialData?.foto)} bucket="hp" previewAlt="Preview foto produk" />
          </div>
        </div>
      </section>

      <GsmArenaAutofill formId={ADMIN_PRODUCT_FORM_ID} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Blok spesifikasi teknis (dipecah per field agar mudah dikontrol dari admin) */}
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-700">Spesifikasi Produk</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="teknologi_jaringan">Teknologi Jaringan</Label>
            <Input id="teknologi_jaringan" name="teknologi_jaringan" defaultValue={valueOrEmpty(spec.teknologi_jaringan)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tanggal_rilis">Tanggal Rilis</Label>
            <Input id="tanggal_rilis" name="tanggal_rilis" type="date" defaultValue={valueOrEmpty(spec.tanggal_rilis).slice(0, 10)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rating_ip">Rating IP</Label>
            <Input id="rating_ip" name="rating_ip" defaultValue={valueOrEmpty(spec.rating_ip)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dimensi">Dimensi</Label>
            <Input id="dimensi" name="dimensi" defaultValue={valueOrEmpty(spec.dimensi)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="berat">Berat</Label>
            <Input id="berat" name="berat" defaultValue={valueOrEmpty(spec.berat)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chipset">Chipset</Label>
            <Input id="chipset" name="chipset" defaultValue={valueOrEmpty(spec.chipset)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tipe_layar">Tipe Layar</Label>
            <Input id="tipe_layar" name="tipe_layar" defaultValue={valueOrEmpty(spec.tipe_layar)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ukuran_layar">Ukuran Layar</Label>
            <Input id="ukuran_layar" name="ukuran_layar" type="number" step="0.1" defaultValue={valueOrEmpty(spec.ukuran_layar)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resolusi">Resolusi</Label>
            <Input id="resolusi" name="resolusi" defaultValue={valueOrEmpty(spec.resolusi)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proteksi_layar">Proteksi Layar</Label>
            <Input id="proteksi_layar" name="proteksi_layar" defaultValue={valueOrEmpty(spec.proteksi_layar)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="os">OS</Label>
            <Input id="os" name="os" defaultValue={valueOrEmpty(spec.os)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tipe_memori">Tipe Memori</Label>
            <Input id="tipe_memori" name="tipe_memori" defaultValue={valueOrEmpty(spec.tipe_memori)} />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="varian_internal">Varian Internal</Label>
            <Input id="varian_internal" name="varian_internal" defaultValue={valueOrEmpty(spec.varian_internal)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kamera_utama_mp">Kamera Utama MP</Label>
            <Input id="kamera_utama_mp" name="kamera_utama_mp" type="number" defaultValue={valueOrEmpty(spec.kamera_utama_mp)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kamera_selfie_mp">Kamera Selfie MP</Label>
            <Input id="kamera_selfie_mp" name="kamera_selfie_mp" type="number" defaultValue={valueOrEmpty(spec.kamera_selfie_mp)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kapasitas_baterai">Kapasitas Baterai</Label>
            <Input id="kapasitas_baterai" name="kapasitas_baterai" type="number" defaultValue={valueOrEmpty(spec.kapasitas_baterai)} />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="detail_kamera_utama">Detail Kamera Utama</Label>
            <textarea
              id="detail_kamera_utama"
              name="detail_kamera_utama"
              defaultValue={valueOrEmpty(spec.detail_kamera_utama)}
              className="min-h-22 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="detail_kamera_selfie">Detail Kamera Selfie</Label>
            <textarea
              id="detail_kamera_selfie"
              name="detail_kamera_selfie"
              defaultValue={valueOrEmpty(spec.detail_kamera_selfie)}
              className="min-h-22 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kamera_utama_video">Video Kamera Utama</Label>
            <Input id="kamera_utama_video" name="kamera_utama_video" defaultValue={valueOrEmpty(spec.kamera_utama_video)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="video_kamera_utama">Video Kamera Utama (alt)</Label>
            <Input id="video_kamera_utama" name="video_kamera_utama" defaultValue={valueOrEmpty(spec.video_kamera_utama)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kamera_selfie_video">Video Kamera Selfie</Label>
            <Input id="kamera_selfie_video" name="kamera_selfie_video" defaultValue={valueOrEmpty(spec.kamera_selfie_video)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kecepatan_cas">Kecepatan Cas</Label>
            <Input id="kecepatan_cas" name="kecepatan_cas" defaultValue={valueOrEmpty(spec.kecepatan_cas)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sound_loudspeaker">Sound Loudspeaker</Label>
            <Input id="sound_loudspeaker" name="sound_loudspeaker" defaultValue={valueOrEmpty(spec.sound_loudspeaker)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sound_jack">Sound Jack</Label>
            <Input id="sound_jack" name="sound_jack" defaultValue={valueOrEmpty(spec.sound_jack)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comms_wlan">WLAN</Label>
            <Input id="comms_wlan" name="comms_wlan" defaultValue={valueOrEmpty(spec.comms_wlan)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comms_bluetooth">Bluetooth</Label>
            <Input id="comms_bluetooth" name="comms_bluetooth" defaultValue={valueOrEmpty(spec.comms_bluetooth)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comms_gps">GPS</Label>
            <Input id="comms_gps" name="comms_gps" defaultValue={valueOrEmpty(spec.comms_gps)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comms_usb">USB</Label>
            <Input id="comms_usb" name="comms_usb" defaultValue={valueOrEmpty(spec.comms_usb)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sensor">Sensor</Label>
            <Input id="sensor" name="sensor" defaultValue={valueOrEmpty(spec.sensor)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kesimpulan_singkat">Kesimpulan</Label>
            <Input id="kesimpulan_singkat" name="kesimpulan_singkat" defaultValue={valueOrEmpty(spec.kesimpulan_singkat)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skor_antutu">Skor AnTuTu</Label>
            <Input id="skor_antutu" name="skor_antutu" type="number" defaultValue={valueOrEmpty(spec.skor_antutu)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skor_geekbench">Skor Geekbench</Label>
            <Input id="skor_geekbench" name="skor_geekbench" type="number" defaultValue={valueOrEmpty(spec.skor_geekbench)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skor_dxomark">Skor DXOMARK</Label>
            <Input id="skor_dxomark" name="skor_dxomark" type="number" defaultValue={valueOrEmpty(spec.skor_dxomark)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bintang_performa">Bintang Performa</Label>
            <Input id="bintang_performa" name="bintang_performa" type="number" min="0" max="10" defaultValue={valueOrEmpty(spec.bintang_performa)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bintang_kamera">Bintang Kamera</Label>
            <Input id="bintang_kamera" name="bintang_kamera" type="number" min="0" max="10" defaultValue={valueOrEmpty(spec.bintang_kamera)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bintang_baterai">Bintang Baterai</Label>
            <Input id="bintang_baterai" name="bintang_baterai" type="number" min="0" max="10" defaultValue={valueOrEmpty(spec.bintang_baterai)} />
          </div>
          <div className="flex items-center gap-2 pt-4">
            <input id="ada_slot_memori" name="ada_slot_memori" value="true" type="checkbox" defaultChecked={booleanToChecked(spec.ada_slot_memori)} />
            <Label htmlFor="ada_slot_memori">Ada Slot Memori</Label>
          </div>
          <div className="flex items-center gap-2 pt-4">
            <input id="ada_nfc" name="ada_nfc" value="true" type="checkbox" defaultChecked={booleanToChecked(spec.ada_nfc)} />
            <Label htmlFor="ada_nfc">Ada NFC</Label>
          </div>
          <div className="flex items-center gap-2 pt-4">
            <input id="ada_jack_audio" name="ada_jack_audio" value="true" type="checkbox" defaultChecked={booleanToChecked(spec.ada_jack_audio)} />
            <Label htmlFor="ada_jack_audio">Ada Jack Audio</Label>
          </div>
        </div>
      </section>

      <ProductFormAssistant formId={ADMIN_PRODUCT_FORM_ID} draftKey={draftKey} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Input relasi marketplace dikirim sebagai JSON lewat komponen editor */}
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">Marketplace Links</h2>
        <p className="mb-4 text-xs text-slate-500">Isi setiap link marketplace satu per satu. Tidak perlu mengetik JSON.</p>
        <MarketplaceLinksEditor name="marketplace_links_json" initialLinks={links} marketplaceOptions={marketplaces} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Input relasi review video juga dikelola sebagai JSON lewat editor */}
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">Reviews</h2>
        <p className="mb-4 text-xs text-slate-500">Tambahkan video review untuk mendukung konten produk.</p>
        <ReviewsEditor name="reviews_json" initialReviews={reviews} />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {/* Preview membantu admin cek ringkasan sebelum submit */}
        <ProductPreviewSheet formId={ADMIN_PRODUCT_FORM_ID} brands={brands} />
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
