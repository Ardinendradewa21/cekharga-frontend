"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MarketplaceOption = {
  id: number;
  nama: string;
  logo?: string | null;
};

type RawMarketplaceLink = {
  marketplace_id?: number | null;
  nama_marketplace?: string | null;
  nama_toko?: string | null;
  harga?: number | string | null;
  url_produk?: string | null;
  kondisi?: string | null;
  status_aktif?: boolean | null;
  marketplace_logo?: string | null;
  marketplace?: {
    logo?: string | null;
  } | null;
};

type MarketplaceLinkRow = {
  row_id: string;
  marketplace_id: number | null;
  nama_marketplace: string;
  nama_toko: string;
  harga: string;
  url_produk: string;
  kondisi: "baru" | "bekas";
  status_aktif: boolean;
  marketplace_logo: string;
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

type MarketplaceLinksEditorProps = {
  name: string;
  marketplaceOptions: MarketplaceOption[];
  initialLinks?: RawMarketplaceLink[];
};

function createEmptyRow(): MarketplaceLinkRow {
  return {
    row_id: crypto.randomUUID(),
    marketplace_id: null,
    nama_marketplace: "",
    nama_toko: "",
    harga: "",
    url_produk: "",
    kondisi: "baru",
    status_aktif: true,
    marketplace_logo: "",
  };
}

function normalizeRow(link: RawMarketplaceLink): MarketplaceLinkRow {
  return {
    row_id: crypto.randomUUID(),
    marketplace_id:
      typeof link.marketplace_id === "number" && Number.isFinite(link.marketplace_id)
        ? link.marketplace_id
        : null,
    nama_marketplace: link.nama_marketplace ?? "",
    nama_toko: link.nama_toko ?? "",
    harga:
      link.harga === null || link.harga === undefined
        ? ""
        : typeof link.harga === "number"
          ? String(link.harga)
          : link.harga,
    url_produk: link.url_produk ?? "",
    kondisi: link.kondisi === "bekas" ? "bekas" : "baru",
    status_aktif: Boolean(link.status_aktif ?? true),
    marketplace_logo: link.marketplace_logo ?? link.marketplace?.logo ?? "",
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

function toPreviewUrl(value: string) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const clean = value.startsWith("/") ? value.slice(1) : value;
  return `/${clean}`;
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function MarketplaceLinksEditor({
  name,
  marketplaceOptions,
  initialLinks = [],
}: MarketplaceLinksEditorProps) {
  const [rows, setRows] = useState<MarketplaceLinkRow[]>(
    initialLinks.length > 0 ? initialLinks.map(normalizeRow) : [createEmptyRow()],
  );
  const marketplaceChoices = useMemo(
    () => sortMarketplaces(marketplaceOptions),
    [marketplaceOptions],
  );
  const [fetchingRows, setFetchingRows] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timerId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timerId);
  }, [toast]);

  const serializedValue = useMemo(() => {
    const cleaned = rows
      .map((row) => {
        const isBlank =
          !row.nama_marketplace.trim() &&
          !row.nama_toko.trim() &&
          !row.harga.trim() &&
          !row.url_produk.trim();

        if (isBlank) return null;

        return {
          marketplace_id: row.marketplace_id,
          nama_marketplace: row.nama_marketplace.trim(),
          nama_toko: row.nama_toko.trim() || null,
          harga: row.harga.trim() ? Number(row.harga) : null,
          url_produk: row.url_produk.trim(),
          kondisi: row.kondisi,
          status_aktif: row.status_aktif,
          marketplace_logo: row.marketplace_logo.trim() || null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return JSON.stringify(cleaned);
  }, [rows]);

  function updateRow(index: number, partial: Partial<MarketplaceLinkRow>) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...partial } : row)));
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

  function removeRow(index: number) {
    setRows((current) => {
      if (current.length <= 1) return [createEmptyRow()];
      return current.filter((_, rowIndex) => rowIndex !== index);
    });
  }

  function addRow() {
    setRows((current) => [...current, createEmptyRow()]);
  }

  function handleMarketplaceSelect(index: number, rawValue: string) {
    if (!rawValue) {
      updateRow(index, { marketplace_id: null, marketplace_logo: "" });
      return;
    }

    const selectedId = Number(rawValue);
    const selectedMarketplace = marketplaceChoices.find((item) => item.id === selectedId);

    if (!selectedMarketplace) {
      updateRow(index, { marketplace_id: null, marketplace_logo: "" });
      return;
    }

    updateRow(index, {
      marketplace_id: selectedMarketplace.id,
      nama_marketplace: selectedMarketplace.nama,
      marketplace_logo: selectedMarketplace.logo ?? "",
    });
  }

  async function handleFetchPrice(index: number) {
    const row = rows[index];
    if (!row) return;

    const targetUrl = row.url_produk.trim();
    if (!targetUrl) {
      showToast("error", "URL produk wajib diisi sebelum fetch harga.");
      return;
    }

    setFetchingState(row.row_id, true);

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

      setRows((current) =>
        current.map((currentRow) => {
          if (currentRow.row_id !== row.row_id) return currentRow;

          return {
            ...currentRow,
            harga: String(Math.trunc(fetchedPrice)),
            nama_marketplace: currentRow.nama_marketplace.trim() ? currentRow.nama_marketplace : marketplaceName,
            marketplace_id: currentRow.marketplace_id ?? relatedMarketplace?.id ?? null,
            marketplace_logo:
              currentRow.marketplace_logo.trim().length > 0
                ? currentRow.marketplace_logo
                : (relatedMarketplace?.logo ?? ""),
          };
        }),
      );

      const formattedPrice = formatRupiah(fetchedPrice);
      showToast("success", `Harga terdeteksi: ${formattedPrice}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      showToast("error", `Gagal mengambil harga marketplace: ${message}`);
    } finally {
      setFetchingState(row.row_id, false);
    }
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={serializedValue} />

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

      {rows.map((row, index) => {
        const isFetchingPrice = Boolean(fetchingRows[row.row_id]);
        const previewUrl = toPreviewUrl(row.marketplace_logo);

        return (
          <div key={row.row_id} className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Link Marketplace #{index + 1}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => removeRow(index)}>
                <Trash2 className="mr-1 h-4 w-4" />
                Hapus
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Pilih Marketplace</Label>
                <select
                  value={row.marketplace_id ?? ""}
                  onChange={(event) => handleMarketplaceSelect(index, event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">Manual (tanpa referensi)</option>
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
                  value={row.nama_marketplace}
                  onChange={(event) => updateRow(index, { nama_marketplace: event.target.value })}
                  placeholder="Shopee / Tokopedia / Blibli"
                  disabled={row.marketplace_id !== null}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Logo Marketplace (Master)</Label>
                {previewUrl ? (
                  <div className="overflow-hidden rounded-lg border bg-slate-50 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt={`Logo marketplace ${index + 1}`} className="h-16 w-auto rounded object-contain" />
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Belum ada logo marketplace untuk row ini. Pilih marketplace master atau isi manual.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Nama Toko</Label>
                <Input
                  value={row.nama_toko}
                  onChange={(event) => updateRow(index, { nama_toko: event.target.value })}
                  placeholder="Nama toko di marketplace"
                />
              </div>

              <div className="space-y-2">
                <Label>Harga</Label>
                <Input
                  value={row.harga}
                  type="number"
                  min={0}
                  step="1"
                  onChange={(event) => updateRow(index, { harga: event.target.value })}
                  placeholder="13999000"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>URL Produk</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={row.url_produk}
                    type="url"
                    onChange={(event) => updateRow(index, { url_produk: event.target.value })}
                    placeholder="https://..."
                    className="sm:flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleFetchPrice(index)}
                    disabled={isFetchingPrice}
                    className="sm:w-[132px]"
                  >
                    {isFetchingPrice ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isFetchingPrice ? "Fetching..." : "Fetch Price"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Kondisi</Label>
                <select
                  value={row.kondisi}
                  onChange={(event) => updateRow(index, { kondisi: event.target.value === "bekas" ? "bekas" : "baru" })}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="baru">baru</option>
                  <option value="bekas">bekas</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-8">
                <input
                  id={`status_aktif_${index}`}
                  type="checkbox"
                  checked={row.status_aktif}
                  onChange={(event) => updateRow(index, { status_aktif: event.target.checked })}
                />
                <Label htmlFor={`status_aktif_${index}`}>Status aktif</Label>
              </div>
            </div>
          </div>
        );
      })}

      <Button type="button" variant="outline" onClick={addRow}>
        <Plus className="mr-1 h-4 w-4" />
        Tambah Link Marketplace
      </Button>
    </div>
  );
}
