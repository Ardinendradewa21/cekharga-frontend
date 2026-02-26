"use client";

import { useMemo, useState } from "react";

import { Label } from "@/components/ui/label";

type BrandOption = {
  id: number;
  nama_brand: string;
  logo?: string | null;
};

type BrandSelectFieldProps = {
  brands: BrandOption[];
  initialBrandId?: number;
  initialBrandLogo?: string;
};

function toPreviewUrl(value: string) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const clean = value.startsWith("/") ? value.slice(1) : value;
  return `/${clean}`;
}

function sortBrands(items: BrandOption[]) {
  return [...items].sort((a, b) =>
    a.nama_brand.localeCompare(b.nama_brand, "id", { sensitivity: "base" }),
  );
}

export function BrandSelectField({
  brands,
  initialBrandId,
  initialBrandLogo = "",
}: BrandSelectFieldProps) {
  const sortedBrands = useMemo(() => sortBrands(brands), [brands]);
  const defaultBrandId = initialBrandId ?? sortedBrands[0]?.id ?? 0;

  const logoByBrandId = useMemo(() => {
    const map: Record<number, string> = {};
    for (const brand of sortedBrands) {
      map[brand.id] = brand.logo ?? "";
    }
    if (defaultBrandId && initialBrandLogo) {
      map[defaultBrandId] = initialBrandLogo;
    }
    return map;
  }, [sortedBrands, defaultBrandId, initialBrandLogo]);

  const [selectedBrandId, setSelectedBrandId] = useState<number>(defaultBrandId);
  const selectedBrandLogo = logoByBrandId[selectedBrandId] ?? "";
  const selectedBrandName =
    sortedBrands.find((brand) => brand.id === selectedBrandId)?.nama_brand ?? "";
  const selectedPreviewUrl = toPreviewUrl(selectedBrandLogo);
  const hasBrandOptions = sortedBrands.length > 0;

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4 md:col-span-2">
      <div className="space-y-2">
        <Label htmlFor="id_brand">Brand</Label>
        <select
          id="id_brand"
          name="id_brand"
          value={selectedBrandId}
          onChange={(event) => setSelectedBrandId(Number(event.target.value))}
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          required
          disabled={!hasBrandOptions}
        >
          {hasBrandOptions ? (
            sortedBrands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.nama_brand}
              </option>
            ))
          ) : (
            <option value={0}>Belum ada brand. Tambahkan di Master Data.</option>
          )}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Logo Brand (Master)</Label>
        <input type="hidden" name="brand_logo" value={selectedBrandLogo} />
        {selectedPreviewUrl ? (
          <div className="overflow-hidden rounded-lg border bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedPreviewUrl} alt={`Logo ${selectedBrandName}`} className="h-20 w-auto rounded object-contain" />
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {hasBrandOptions
              ? "Brand ini belum memiliki logo master."
              : "Belum ada brand. Silakan tambah dari Master Data > Brands."}
          </p>
        )}
      </div>
    </div>
  );
}
