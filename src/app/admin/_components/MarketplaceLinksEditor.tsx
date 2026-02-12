"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ImageUploadField } from "./ImageUploadField";

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

export function MarketplaceLinksEditor({
  name,
  marketplaceOptions,
  initialLinks = [],
}: MarketplaceLinksEditorProps) {
  const [rows, setRows] = useState<MarketplaceLinkRow[]>(
    initialLinks.length > 0 ? initialLinks.map(normalizeRow) : [createEmptyRow()],
  );

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
      updateRow(index, { marketplace_id: null });
      return;
    }

    const selectedId = Number(rawValue);
    const selectedMarketplace = marketplaceOptions.find((item) => item.id === selectedId);

    if (!selectedMarketplace) {
      updateRow(index, { marketplace_id: null });
      return;
    }

    updateRow(index, {
      marketplace_id: selectedMarketplace.id,
      nama_marketplace: selectedMarketplace.nama,
      marketplace_logo: selectedMarketplace.logo ?? "",
    });
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={serializedValue} />

      {rows.map((row, index) => (
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
                {marketplaceOptions.map((marketplace) => (
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
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Logo Marketplace</Label>
              <ImageUploadField
                name={`marketplace_logo_dummy_${index}`}
                value={row.marketplace_logo}
                onChange={(nextPath) => updateRow(index, { marketplace_logo: nextPath })}
                bucket="marketplaces"
                previewAlt={`Preview logo marketplace ${index + 1}`}
                includeHiddenInput={false}
              />
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
              <Input
                value={row.url_produk}
                type="url"
                onChange={(event) => updateRow(index, { url_produk: event.target.value })}
                placeholder="https://..."
              />
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
      ))}

      <Button type="button" variant="outline" onClick={addRow}>
        <Plus className="mr-1 h-4 w-4" />
        Tambah Link Marketplace
      </Button>
    </div>
  );
}
