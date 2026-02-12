"use client";

import { useMemo, useState } from "react";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type BrandOption = {
  id: number;
  nama_brand: string;
};

type PreviewMarketplaceLink = {
  nama_marketplace: string;
  nama_toko: string | null;
  harga: number | null;
  kondisi: string;
  status_aktif: boolean;
  url_produk: string;
};

type PreviewReview = {
  reviewer_name: string;
  platform: string;
  video_url: string;
  highlight_quote: string | null;
};

type PreviewState = {
  namaProduk: string;
  slug: string;
  brandName: string;
  tahunRilis: string;
  hargaBaru: string;
  hargaBekas: string;
  status: string;
  foto: string;
  chipset: string;
  os: string;
  layar: string;
  baterai: string;
  kamera: string;
  isNfc: boolean;
  isJackAudio: boolean;
  marketplaceLinks: PreviewMarketplaceLink[];
  reviews: PreviewReview[];
};

type ProductPreviewSheetProps = {
  formId: string;
  brands: BrandOption[];
};

function toCurrency(numberValue: number | null): string {
  if (numberValue === null || !Number.isFinite(numberValue)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numberValue);
}

function safeParseJsonArray<T>(raw: string): T[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function buildPreviewState(form: HTMLFormElement, brands: BrandOption[]): PreviewState {
  const formData = new FormData(form);
  const brandMap = new Map(brands.map((brand) => [String(brand.id), brand.nama_brand]));

  const getText = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  };

  const toBoolean = (key: string) => {
    const value = getText(key).toLowerCase();
    return value === "true" || value === "1" || value === "on" || value === "yes";
  };

  const toNumber = (value: unknown): number | null => {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const rawLinks = safeParseJsonArray<{
    nama_marketplace?: string;
    nama_toko?: string | null;
    harga?: number | null;
    kondisi?: string;
    status_aktif?: boolean;
    url_produk?: string;
  }>(getText("marketplace_links_json"));

  const rawReviews = safeParseJsonArray<{
    reviewer_name?: string;
    platform?: string;
    video_url?: string;
    highlight_quote?: string | null;
  }>(getText("reviews_json"));

  const marketplaceLinks: PreviewMarketplaceLink[] = rawLinks
    .map((item) => ({
      nama_marketplace: item.nama_marketplace?.trim() || "-",
      nama_toko: item.nama_toko?.trim() || null,
      harga: toNumber(item.harga),
      kondisi: item.kondisi?.trim() || "-",
      status_aktif: Boolean(item.status_aktif ?? true),
      url_produk: item.url_produk?.trim() || "",
    }))
    .filter((item) => item.url_produk.length > 0 || item.nama_marketplace !== "-");

  const reviews: PreviewReview[] = rawReviews
    .map((item) => ({
      reviewer_name: item.reviewer_name?.trim() || "-",
      platform: item.platform?.trim() || "-",
      video_url: item.video_url?.trim() || "",
      highlight_quote: item.highlight_quote?.trim() || null,
    }))
    .filter((item) => item.video_url.length > 0 || item.reviewer_name !== "-");

  return {
    namaProduk: getText("nama_produk") || "-",
    slug: getText("slug") || "-",
    brandName: brandMap.get(getText("id_brand")) || `ID ${getText("id_brand") || "-"}`,
    tahunRilis: getText("tahun_rilis") || "-",
    hargaBaru: toCurrency(toNumber(getText("harga_terendah_baru"))),
    hargaBekas: toCurrency(toNumber(getText("harga_terendah_bekas"))),
    status: getText("status") || "-",
    foto: getText("foto") || "-",
    chipset: getText("chipset") || "-",
    os: getText("os") || "-",
    layar: [getText("tipe_layar"), getText("ukuran_layar") ? `${getText("ukuran_layar")} inch` : ""].filter(Boolean).join(" | ") || "-",
    baterai: [getText("kapasitas_baterai") ? `${getText("kapasitas_baterai")} mAh` : "", getText("kecepatan_cas")].filter(Boolean).join(" | ") || "-",
    kamera: [getText("kamera_utama_mp") ? `${getText("kamera_utama_mp")} MP` : "", getText("kamera_selfie_mp") ? `Selfie ${getText("kamera_selfie_mp")} MP` : ""].filter(Boolean).join(" | ") || "-",
    isNfc: toBoolean("ada_nfc"),
    isJackAudio: toBoolean("ada_jack_audio"),
    marketplaceLinks,
    reviews,
  };
}

export function ProductPreviewSheet({ formId, brands }: ProductPreviewSheetProps) {
  const [open, setOpen] = useState(false);
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);

  const keyFacts = useMemo(() => {
    if (!previewState) return [];
    return [
      { label: "Nama Produk", value: previewState.namaProduk },
      { label: "Slug", value: previewState.slug },
      { label: "Brand", value: previewState.brandName },
      { label: "Tahun Rilis", value: previewState.tahunRilis },
      { label: "Harga Baru", value: previewState.hargaBaru },
      { label: "Harga Bekas", value: previewState.hargaBekas },
      { label: "Status", value: previewState.status },
      { label: "Path Foto", value: previewState.foto },
      { label: "Chipset", value: previewState.chipset },
      { label: "OS", value: previewState.os },
      { label: "Layar", value: previewState.layar },
      { label: "Baterai", value: previewState.baterai },
      { label: "Kamera", value: previewState.kamera },
      { label: "NFC", value: previewState.isNfc ? "Ya" : "Tidak" },
      { label: "Jack Audio", value: previewState.isJackAudio ? "Ya" : "Tidak" },
    ];
  }, [previewState]);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      const form = document.getElementById(formId);
      if (!(form instanceof HTMLFormElement)) return;
      setPreviewState(buildPreviewState(form, brands));
    }
    setOpen(nextOpen);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline">
          <Eye className="mr-2 h-4 w-4" />
          Preview Sebelum Simpan
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Preview Data Produk</SheetTitle>
          <SheetDescription>Pastikan data utama, link marketplace, dan review sudah benar sebelum submit.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 p-4">
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Ringkasan Utama</h3>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              {keyFacts.map((item) => (
                <div key={item.label}>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="font-medium text-slate-900">{item.value || "-"}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              Marketplace Links ({previewState?.marketplaceLinks.length ?? 0})
            </h3>
            {previewState?.marketplaceLinks.length ? (
              <div className="space-y-3">
                {previewState.marketplaceLinks.map((item, index) => (
                  <div key={`${item.url_produk}-${index}`} className="rounded-md border border-slate-200 p-3 text-sm">
                    <p className="font-semibold text-slate-900">{item.nama_marketplace}</p>
                    <p className="text-slate-600">{item.nama_toko || "-"}</p>
                    <p className="text-slate-700">{toCurrency(item.harga)}</p>
                    <p className="text-xs text-slate-500">
                      {item.kondisi} | {item.status_aktif ? "aktif" : "nonaktif"}
                    </p>
                    <p className="truncate text-xs text-blue-600">{item.url_produk}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Belum ada link marketplace.</p>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Reviews ({previewState?.reviews.length ?? 0})</h3>
            {previewState?.reviews.length ? (
              <div className="space-y-3">
                {previewState.reviews.map((item, index) => (
                  <div key={`${item.video_url}-${index}`} className="rounded-md border border-slate-200 p-3 text-sm">
                    <p className="font-semibold text-slate-900">
                      {item.reviewer_name} <span className="text-slate-500">({item.platform})</span>
                    </p>
                    <p className="truncate text-xs text-blue-600">{item.video_url}</p>
                    <p className="text-slate-600">{item.highlight_quote || "-"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Belum ada review.</p>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
