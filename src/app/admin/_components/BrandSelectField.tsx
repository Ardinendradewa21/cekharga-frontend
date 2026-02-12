"use client";

import { useMemo, useState } from "react";

import { Label } from "@/components/ui/label";

import { ImageUploadField } from "./ImageUploadField";

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

export function BrandSelectField({ brands, initialBrandId, initialBrandLogo = "" }: BrandSelectFieldProps) {
  const defaultBrandId = initialBrandId ?? brands[0]?.id ?? 0;

  const initialLogoMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const brand of brands) {
      map[brand.id] = brand.logo ?? "";
    }
    if (defaultBrandId && initialBrandLogo) {
      map[defaultBrandId] = initialBrandLogo;
    }
    return map;
  }, [brands, defaultBrandId, initialBrandLogo]);

  const [selectedBrandId, setSelectedBrandId] = useState<number>(defaultBrandId);
  const [logoByBrandId, setLogoByBrandId] = useState<Record<number, string>>(initialLogoMap);

  const selectedBrandLogo = logoByBrandId[selectedBrandId] ?? "";

  function handleLogoChange(nextPath: string) {
    setLogoByBrandId((current) => ({
      ...current,
      [selectedBrandId]: nextPath,
    }));
  }

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
        >
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.nama_brand}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Logo Brand</Label>
        <ImageUploadField
          name="brand_logo"
          value={selectedBrandLogo}
          onChange={handleLogoChange}
          bucket="brands"
          previewAlt="Preview logo brand"
        />
      </div>
    </div>
  );
}
