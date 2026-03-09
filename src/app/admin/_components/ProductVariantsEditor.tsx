"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractRamRomFromTitle } from "@/server/utils/productMapping";
import { formatRupiah } from "@/lib/format";

type MarketplaceOption = {
  id: number;
  nama: string;
  logo?: string | null;
};

type RawVariantPrice = {
  marketplace_id?: number | null;
  nama_marketplace?: string | null;
  marketplace_logo?: string | null;
  seller_name?: string | null;
  price?: number | string | null;
  affiliate_url?: string | null;
  kondisi?: string | null;
  status_aktif?: boolean | null;
};

type RawVariant = {
  label?: string | null;
  warna?: string | null;
  sku?: string | null;
  is_default?: boolean | null;
  status_aktif?: boolean | null;
  prices?: RawVariantPrice[] | null;
};

type VariantPriceRow = {
  row_id: string;
  marketplace_id: number | null;
  nama_marketplace: string;
  marketplace_logo: string;
  seller_name: string;
  price: string;
  affiliate_url: string;
  kondisi: "baru" | "bekas";
  status_aktif: boolean;
};

type VariantRow = {
  row_id: string;
  label: string;
  warna: string;
  sku: string;
  is_default: boolean;
  status_aktif: boolean;
  prices: VariantPriceRow[];
};

type ProductVariantsEditorProps = {
  name: string;
  legacyLinksName: string;
  marketplaceOptions: MarketplaceOption[];
  initialVariants?: RawVariant[];
};

type FetchPriceApiPayload = {
  success?: boolean;
  message?: string;
  data?: {
    price?: number | null;
    source?: string;
  };
};

type ToastState = {
  type: "success" | "error";
  message: string;
};

function buildStaticVariantRowId(index: number): string {
  return `variant_${index}`;
}

function buildStaticPriceRowId(variantIndex: number, priceIndex: number): string {
  return `price_${variantIndex}_${priceIndex}`;
}

function createEmptyPriceRow(rowId: string): VariantPriceRow {
  return {
    row_id: rowId,
    marketplace_id: null,
    nama_marketplace: "",
    marketplace_logo: "",
    seller_name: "",
    price: "",
    affiliate_url: "",
    kondisi: "baru",
    status_aktif: true,
  };
}

function createEmptyVariantRow(variantRowId: string, firstPriceRowId: string): VariantRow {
  return {
    row_id: variantRowId,
    label: "",
    warna: "",
    sku: "",
    is_default: true,
    status_aktif: true,
    prices: [createEmptyPriceRow(firstPriceRowId)],
  };
}

function ensureSingleDefaultVariant(rows: VariantRow[]): VariantRow[] {
  if (rows.length === 0) {
    return [createEmptyVariantRow(buildStaticVariantRowId(0), buildStaticPriceRowId(0, 0))];
  }

  const firstActiveIndex = rows.findIndex((row) => row.status_aktif);
  const preferredDefaultIndex = rows.findIndex((row) => row.is_default && row.status_aktif);
  const fallbackDefaultIndex =
    preferredDefaultIndex >= 0 ? preferredDefaultIndex : firstActiveIndex >= 0 ? firstActiveIndex : 0;

  // Selalu pertahankan tepat satu default variant.
  // Prioritasnya: default aktif yang sudah ada, lalu varian aktif pertama, lalu item pertama.
  return rows.map((row, index) => ({
    ...row,
    is_default: index === fallbackDefaultIndex,
  }));
}

function normalizePriceRow(price: RawVariantPrice, variantIndex: number, priceIndex: number): VariantPriceRow {
  return {
    row_id: buildStaticPriceRowId(variantIndex, priceIndex),
    marketplace_id:
      typeof price.marketplace_id === "number" && Number.isFinite(price.marketplace_id) ? price.marketplace_id : null,
    nama_marketplace: price.nama_marketplace ?? "",
    marketplace_logo: price.marketplace_logo ?? "",
    seller_name: price.seller_name ?? "",
    price:
      price.price === null || price.price === undefined
        ? ""
        : typeof price.price === "number"
          ? String(price.price)
          : price.price,
    affiliate_url: price.affiliate_url ?? "",
    kondisi: price.kondisi === "bekas" ? "bekas" : "baru",
    status_aktif: Boolean(price.status_aktif ?? true),
  };
}

function normalizeVariantRow(variant: RawVariant, index: number): VariantRow {
  const prices = (variant.prices ?? []).map((price, priceIndex) => normalizePriceRow(price, index, priceIndex));

  return {
    row_id: buildStaticVariantRowId(index),
    label: variant.label ?? "",
    warna: variant.warna ?? "",
    sku: variant.sku ?? "",
    is_default: Boolean(variant.is_default ?? index === 0),
    status_aktif: Boolean(variant.status_aktif ?? true),
    prices: prices.length > 0 ? prices : [createEmptyPriceRow(buildStaticPriceRowId(index, 0))],
  };
}

function sortMarketplaces(items: MarketplaceOption[]) {
  return [...items].sort((a, b) => a.nama.localeCompare(b.nama, "id", { sensitivity: "base" }));
}

function getMarketplaceNameFromSource(source: string): string {
  if (source === "tokopedia") return "Tokopedia";
  if (source === "shopee") return "Shopee";
  return "";
}

function formatStorageLabel(storageGb: number): string {
  if (storageGb >= 1024 && storageGb % 1024 === 0) {
    return `${storageGb / 1024}TB`;
  }
  return `${storageGb}GB`;
}

function toPriceNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function ProductVariantsEditor({
  name,
  legacyLinksName,
  marketplaceOptions,
  initialVariants = [],
}: ProductVariantsEditorProps) {
  const [variants, setVariants] = useState<VariantRow[]>(() =>
    initialVariants.length > 0
      ? ensureSingleDefaultVariant(initialVariants.map(normalizeVariantRow))
      : [createEmptyVariantRow(buildStaticVariantRowId(0), buildStaticPriceRowId(0, 0))],
  );
  const nextVariantRuntimeId = useRef(variants.length);
  const nextPriceRuntimeId = useRef(variants.reduce((total, variant) => total + variant.prices.length, 0));
  const marketplaceChoices = useMemo(() => sortMarketplaces(marketplaceOptions), [marketplaceOptions]);
  const [fetchingRows, setFetchingRows] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<ToastState | null>(null);

  function createRuntimeVariantRowId() {
    const rowId = `variant_runtime_${nextVariantRuntimeId.current}`;
    nextVariantRuntimeId.current += 1;
    return rowId;
  }

  function createRuntimePriceRowId() {
    const rowId = `price_runtime_${nextPriceRuntimeId.current}`;
    nextPriceRuntimeId.current += 1;
    return rowId;
  }

  useEffect(() => {
    if (!toast) return;
    const timerId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timerId);
  }, [toast]);

  const serializedVariants = useMemo(() => {
    // Hidden input ini menjadi source of truth untuk struktur relasi baru:
    // Product -> ProductVariant -> MarketplacePrice.
    const cleaned = variants
      .map((variant) => {
        const label = variant.label.trim();
        const prices = variant.prices
          .map((price) => {
            const hasAnyValue =
              price.nama_marketplace.trim() ||
              price.seller_name.trim() ||
              price.price.trim() ||
              price.affiliate_url.trim();
            if (!hasAnyValue) return null;

            return {
              marketplace_id: price.marketplace_id,
              nama_marketplace: price.nama_marketplace.trim(),
              marketplace_logo: price.marketplace_logo.trim() || null,
              seller_name: price.seller_name.trim() || null,
              price: price.price.trim() ? Number(price.price) : null,
              affiliate_url: price.affiliate_url.trim(),
              kondisi: price.kondisi,
              status_aktif: price.status_aktif,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        const hasAnyVariantValue = label || variant.warna.trim() || variant.sku.trim() || prices.length > 0;
        if (!hasAnyVariantValue) return null;

        return {
          label,
          warna: variant.warna.trim() || null,
          sku: variant.sku.trim() || null,
          is_default: variant.is_default,
          status_aktif: variant.status_aktif,
          prices,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return JSON.stringify(cleaned);
  }, [variants]);

  const serializedLegacyLinks = useMemo(() => {
    // Flatten legacy tetap dikirim supaya preview/listing lama yang masih membaca
    // `marketplace_links_json` tidak langsung rusak saat transisi arsitektur.
    const flattened = variants.flatMap((variant) =>
      variant.prices
        .map((price) => {
          const hasAnyValue =
            price.nama_marketplace.trim() ||
            price.seller_name.trim() ||
            price.price.trim() ||
            price.affiliate_url.trim();
          if (!hasAnyValue) return null;

          return {
            marketplace_id: price.marketplace_id,
            nama_marketplace: price.nama_marketplace.trim(),
            marketplace_logo: price.marketplace_logo.trim() || null,
            nama_toko: price.seller_name.trim() || null,
            harga: price.price.trim() ? Number(price.price) : null,
            url_produk: price.affiliate_url.trim(),
            kondisi: price.kondisi,
            status_aktif: price.status_aktif,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    );

    return JSON.stringify(flattened);
  }, [variants]);

  function updateVariant(index: number, partial: Partial<VariantRow>) {
    setVariants((current) => {
      const next = current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...partial } : item));
      return ensureSingleDefaultVariant(next);
    });
  }

  function updatePrice(variantIndex: number, priceIndex: number, partial: Partial<VariantPriceRow>) {
    setVariants((current) =>
      current.map((variant, currentVariantIndex) => {
        if (currentVariantIndex !== variantIndex) return variant;
        return {
          ...variant,
          prices: variant.prices.map((price, currentPriceIndex) =>
            currentPriceIndex === priceIndex ? { ...price, ...partial } : price,
          ),
        };
      }),
    );
  }

  function showToast(type: ToastState["type"], message: string) {
    setToast({ type, message });
  }

  function setFetchingState(rowId: string, isFetching: boolean) {
    setFetchingRows((current) => {
      if (isFetching) {
        return {
          ...current,
          [rowId]: true,
        };
      }

      const next = { ...current };
      delete next[rowId];
      return next;
    });
  }

  function addVariant() {
    setVariants((current) =>
      ensureSingleDefaultVariant([
        ...current,
        {
          ...createEmptyVariantRow(createRuntimeVariantRowId(), createRuntimePriceRowId()),
          is_default: false,
        },
      ]),
    );
  }

  function removeVariant(index: number) {
    setVariants((current) => {
      if (current.length <= 1) {
        return [createEmptyVariantRow(createRuntimeVariantRowId(), createRuntimePriceRowId())];
      }

      const next = current.filter((_, currentIndex) => currentIndex !== index);
      return ensureSingleDefaultVariant(next);
    });
  }

  function setDefaultVariant(index: number) {
    setVariants((current) =>
      ensureSingleDefaultVariant(current.map((variant, currentIndex) => ({ ...variant, is_default: currentIndex === index }))),
    );
  }

  function addPriceRow(variantIndex: number) {
    setVariants((current) =>
      current.map((variant, currentIndex) =>
        currentIndex === variantIndex
          ? { ...variant, prices: [...variant.prices, createEmptyPriceRow(createRuntimePriceRowId())] }
          : variant,
      ),
    );
  }

  function removePriceRow(variantIndex: number, priceIndex: number) {
    setVariants((current) =>
      current.map((variant, currentIndex) => {
        if (currentIndex !== variantIndex) return variant;
        if (variant.prices.length <= 1) {
          return { ...variant, prices: [createEmptyPriceRow(createRuntimePriceRowId())] };
        }
        return {
          ...variant,
          prices: variant.prices.filter((_, currentPriceIndex) => currentPriceIndex !== priceIndex),
        };
      }),
    );
  }

  function handleMarketplaceSelect(variantIndex: number, priceIndex: number, rawValue: string) {
    if (!rawValue) {
      updatePrice(variantIndex, priceIndex, {
        marketplace_id: null,
        nama_marketplace: "",
        marketplace_logo: "",
      });
      return;
    }

    const selectedId = Number(rawValue);
    const selectedMarketplace = marketplaceChoices.find((item) => item.id === selectedId);

    if (!selectedMarketplace) return;

    updatePrice(variantIndex, priceIndex, {
      marketplace_id: selectedMarketplace.id,
      nama_marketplace: selectedMarketplace.nama,
      marketplace_logo: selectedMarketplace.logo ?? "",
    });
  }

  async function handleFetchPrice(variantIndex: number, priceIndex: number) {
    const variant = variants[variantIndex];
    const priceRow = variant?.prices[priceIndex];
    if (!priceRow) return;

    const targetUrl = priceRow.affiliate_url.trim();
    if (!targetUrl) {
      showToast("error", "URL affiliate wajib diisi sebelum fetch harga.");
      return;
    }

    setFetchingState(priceRow.row_id, true);

    try {
      const response = await fetch("/api/admin/marketplace-price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: targetUrl }),
      });

      const payload = (await response.json().catch(() => null)) as FetchPriceApiPayload | null;
      const messageFromApi =
        typeof payload?.message === "string" && payload.message.trim().length > 0
          ? payload.message
          : "Failed to parse price automatically. Please input manually.";

      if (!response.ok || !payload?.success || typeof payload.data?.price !== "number") {
        showToast("error", messageFromApi);
        return;
      }

      const fetchedPrice = payload.data.price;
      const source = typeof payload.data.source === "string" ? payload.data.source.toLowerCase() : "";
      const marketplaceName = getMarketplaceNameFromSource(source);
      const relatedMarketplace = marketplaceChoices.find((option) =>
        option.nama.trim().toLowerCase().includes(source),
      );

      // Harga hasil fetch hanya menimpa row aktif yang diklik.
      // Jika marketplace row masih kosong, source dari scraper ikut dipakai untuk mengisi referensinya.
      updatePrice(variantIndex, priceIndex, {
        price: String(Math.trunc(fetchedPrice)),
        nama_marketplace: priceRow.nama_marketplace.trim() ? priceRow.nama_marketplace : marketplaceName,
        marketplace_id: priceRow.marketplace_id ?? relatedMarketplace?.id ?? null,
        marketplace_logo:
          priceRow.marketplace_logo.trim().length > 0 ? priceRow.marketplace_logo : (relatedMarketplace?.logo ?? ""),
      });

      showToast("success", `Harga terdeteksi: ${formatRupiah(fetchedPrice)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      showToast("error", `Gagal mengambil harga marketplace: ${message}`);
    } finally {
      setFetchingState(priceRow.row_id, false);
    }
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={serializedVariants} />
      <input type="hidden" name={legacyLinksName} value={serializedLegacyLinks} />

      {toast ? (
        <div className="fixed right-4 top-4 z-50 w-[min(24rem,calc(100vw-2rem))]">
          <div
            className={`rounded-xl border px-4 py-3 text-sm shadow-lg ${
              toast.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      {variants.map((variant, variantIndex) => {
        // Preview parse ini membantu admin melihat apakah label seperti `8/256GB`
        // benar-benar terbaca sebagai RAM/Storage oleh util regex yang juga dipakai backend.
        const parsed = extractRamRomFromTitle(variant.label);
        const hasParsedCapacity = parsed.ramGb !== null && parsed.storageGb !== null;
        const parsedRamGb = hasParsedCapacity ? parsed.ramGb : null;
        const parsedStorageGb = hasParsedCapacity ? parsed.storageGb : null;
        const activePriceCount = variant.prices.filter((price) => price.status_aktif).length;
        const activePrices = variant.prices
          .filter((price) => price.status_aktif)
          .map((price) => toPriceNumber(price.price))
          .filter((price): price is number => price !== null);
        const lowestActivePrice = activePrices.length > 0 ? Math.min(...activePrices) : null;

        return (
        <div
          key={variant.row_id}
          className={`rounded-2xl border p-4 transition-colors ${
            variant.status_aktif
              ? "border-slate-200 bg-slate-50/60"
              : "border-dashed border-slate-300 bg-slate-100/90 opacity-80"
          }`}
        >
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Varian #{variantIndex + 1}</p>
              <p className="text-xs text-slate-500">Masukkan label seperti `8/256GB` agar backend bisa mapping RAM dan storage.</p>
              {!variant.status_aktif ? (
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Varian ini tetap tersimpan, tetapi tidak akan diprioritaskan di halaman detail sampai diaktifkan lagi.
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    variant.is_default
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {variant.is_default ? "Default" : "Non-default"}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    variant.status_aktif
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-100 text-slate-500"
                  }`}
                >
                  {variant.status_aktif ? "Varian aktif" : "Varian nonaktif"}
                </span>
                <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                  {activePriceCount} harga aktif
                </span>
                {lowestActivePrice !== null ? (
                  <span className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-700">
                    Termurah {formatRupiah(lowestActivePrice)}
                  </span>
                ) : null}
                {hasParsedCapacity ? (
                  <>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      RAM {parsedRamGb}GB
                    </span>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                      Storage {parsedStorageGb !== null ? formatStorageLabel(parsedStorageGb) : "-"}
                    </span>
                  </>
                ) : (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    Label belum terbaca sebagai format RAM/Storage
                  </span>
                )}
                {parsed.matchedPattern ? (
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    Pattern: {parsed.matchedPattern}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={variant.is_default ? "default" : "outline"}
                onClick={() => setDefaultVariant(variantIndex)}
                disabled={!variant.status_aktif}
              >
                <Star className="mr-1 h-4 w-4" />
                {variant.is_default ? "Varian Default" : "Jadikan Default"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => removeVariant(variantIndex)}>
                <Trash2 className="mr-1 h-4 w-4" />
                Hapus Varian
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label>Label Varian</Label>
              <Input
                value={variant.label}
                onChange={(event) => updateVariant(variantIndex, { label: event.target.value })}
                placeholder="Contoh: 8/256GB"
              />
            </div>

            <div className="space-y-2">
              <Label>SKU</Label>
              <Input
                value={variant.sku}
                onChange={(event) => updateVariant(variantIndex, { sku: event.target.value })}
                placeholder="SKU opsional"
              />
            </div>

            <div className="space-y-2">
              <Label>Warna</Label>
              <Input
                value={variant.warna}
                onChange={(event) => updateVariant(variantIndex, { warna: event.target.value })}
                placeholder="Onyx Black"
              />
            </div>

            <div className="flex items-center gap-2 pt-8">
              <input
                id={`variant_active_${variant.row_id}`}
                type="checkbox"
                checked={variant.status_aktif}
                onChange={(event) => updateVariant(variantIndex, { status_aktif: event.target.checked })}
              />
              <Label htmlFor={`variant_active_${variant.row_id}`}>Varian aktif</Label>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Harga Marketplace</p>
                <p className="text-xs text-slate-500">Setiap baris harga akan tersimpan spesifik untuk varian ini.</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => addPriceRow(variantIndex)}>
                <Plus className="mr-1 h-4 w-4" />
                Tambah Harga Marketplace
              </Button>
            </div>

            {variant.prices.map((price, priceIndex) => {
              // State loading dipisah per row agar admin tetap bisa mengedit row lain saat satu fetch berjalan.
              const isFetchingPrice = Boolean(fetchingRows[price.row_id]);
              const numericPrice = toPriceNumber(price.price);
              const isLowestActivePrice =
                price.status_aktif && lowestActivePrice !== null && numericPrice !== null && numericPrice === lowestActivePrice;

              return (
                <div
                  key={price.row_id}
                  className={`rounded-xl border p-4 transition-colors ${
                    price.status_aktif
                      ? "border-slate-200 bg-white"
                      : "border-dashed border-slate-200 bg-slate-50/80"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-800">Harga #{priceIndex + 1}</p>
                      {isLowestActivePrice ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          Termurah di varian ini
                        </span>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleFetchPrice(variantIndex, priceIndex)}
                        disabled={isFetchingPrice}
                      >
                        {isFetchingPrice ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                        {isFetchingPrice ? "Fetching..." : "Fetch Price"}
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => removePriceRow(variantIndex, priceIndex)}>
                        <Trash2 className="mr-1 h-4 w-4" />
                        Hapus
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Marketplace</Label>
                      <select
                        value={price.marketplace_id ?? ""}
                        onChange={(event) => handleMarketplaceSelect(variantIndex, priceIndex, event.target.value)}
                        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option value="">Pilih marketplace</option>
                        {marketplaceChoices.map((marketplace) => (
                          <option key={marketplace.id} value={marketplace.id}>
                            {marketplace.nama}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Nama Marketplace</Label>
                      <Input
                        value={price.nama_marketplace}
                        onChange={(event) => updatePrice(variantIndex, priceIndex, { nama_marketplace: event.target.value })}
                        placeholder="Nama marketplace"
                        disabled={price.marketplace_id !== null}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Harga</Label>
                      <Input
                        value={price.price}
                        type="number"
                        min={0}
                        step="1"
                        onChange={(event) => updatePrice(variantIndex, priceIndex, { price: event.target.value })}
                        placeholder="5499000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Nama Toko</Label>
                      <Input
                        value={price.seller_name}
                        onChange={(event) => updatePrice(variantIndex, priceIndex, { seller_name: event.target.value })}
                        placeholder="Official Store"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Link URL Affiliasi</Label>
                      <Input
                        value={price.affiliate_url}
                        type="url"
                        onChange={(event) => updatePrice(variantIndex, priceIndex, { affiliate_url: event.target.value })}
                        placeholder="https://..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Kondisi</Label>
                      <select
                        value={price.kondisi}
                        onChange={(event) =>
                          updatePrice(variantIndex, priceIndex, {
                            kondisi: event.target.value === "bekas" ? "bekas" : "baru",
                          })
                        }
                        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option value="baru">baru</option>
                        <option value="bekas">bekas</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-8">
                      <input
                        id={`price_active_${price.row_id}`}
                        type="checkbox"
                        checked={price.status_aktif}
                        onChange={(event) => updatePrice(variantIndex, priceIndex, { status_aktif: event.target.checked })}
                      />
                      <Label htmlFor={`price_active_${price.row_id}`}>Harga aktif</Label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        );
      })}

      <Button type="button" variant="outline" onClick={addVariant}>
        <Plus className="mr-1 h-4 w-4" />
        Tambah Varian
      </Button>
    </div>
  );
}
