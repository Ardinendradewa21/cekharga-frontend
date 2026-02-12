"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Filter, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Brand {
  id: number;
  nama_brand: string;
  slug: string;
}

// Definisikan tipe data untuk filter agar tidak error 'any'
export interface FilterState {
  brands: string;
  min_price: string;
  max_price: string;
  use_case: string;
  has_nfc: string;
}

interface FilterSidebarProps {
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

export default function FilterSidebar({ onFilterChange, className }: FilterSidebarProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [useCase, setUseCase] = useState("");
  const [hasNfc, setHasNfc] = useState(false);

  // 1. Ambil List Brand dari API
  useEffect(() => {
    fetch("/api/brands")
      .then((res) => res.json())
      .then((data) => {
        if (data.success || data.status === 'success') setBrands(data.data);
      })
      .catch((err) => console.error("Gagal ambil brand:", err));
  }, []);

  // 2. Logic saat Checkbox Brand diklik
  const handleBrandChange = (slug: string) => {
    const updated = selectedBrands.includes(slug)
      ? selectedBrands.filter((b) => b !== slug) 
      : [...selectedBrands, slug]; 
    
    setSelectedBrands(updated);
    // Kirim perubahan langsung ke parent
    applyFilter(updated, minPrice, maxPrice, useCase, hasNfc);
  };

  // 3. Logic Reset
  const handleReset = () => {
    setSelectedBrands([]);
    setMinPrice("");
    setMaxPrice("");
    setUseCase("");
    setHasNfc(false);
    applyFilter([], "", "", "", false);
  };

  // 4. Helper kirim data
  const applyFilter = (
    brands: string[],
    min: string,
    max: string,
    useCaseValue: string,
    hasNfcValue: boolean,
  ) => {
    onFilterChange({
      brands: brands.join(","),
      min_price: min,
      max_price: max,
      use_case: useCaseValue,
      has_nfc: hasNfcValue ? "1" : "",
    });
  };

  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-fit sticky top-24", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Filter className="w-4 h-4" /> Filter
        </h3>
        <button 
          onClick={handleReset}
          className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      {/* --- FILTER HARGA --- */}
      <div className="space-y-3">
        <Label className="text-xs font-bold text-slate-400 uppercase">Rentang Harga</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input 
            placeholder="Min" 
            className="text-xs" 
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <Input 
            placeholder="Max" 
            className="text-xs" 
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
        <Button 
          size="sm" 
          variant="secondary" 
          className="w-full text-xs font-bold"
          onClick={() => applyFilter(selectedBrands, minPrice, maxPrice, useCase, hasNfc)}
        >
          Terapkan Harga
        </Button>
      </div>

      <Separator className="my-6" />

      {/* --- FILTER KEBUTUHAN --- */}
      <div className="space-y-3">
        <Label className="text-xs font-bold text-slate-400 uppercase">Kategori Kebutuhan</Label>
        <select
          value={useCase}
          onChange={(event) => {
            const nextValue = event.target.value;
            setUseCase(nextValue);
            applyFilter(selectedBrands, minPrice, maxPrice, nextValue, hasNfc);
          }}
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">Semua Kebutuhan</option>
          <option value="gaming">Gaming (AnTuTu tinggi)</option>
          <option value="camera">Fotografi (kamera utama &gt;= 50MP)</option>
          <option value="battery">Baterai Awet (&gt;= 5000mAh)</option>
          <option value="daily">Harian Komplit (NFC + baterai besar)</option>
        </select>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="only-nfc"
            checked={hasNfc}
            onCheckedChange={(checked) => {
              const nextValue = Boolean(checked);
              setHasNfc(nextValue);
              applyFilter(selectedBrands, minPrice, maxPrice, useCase, nextValue);
            }}
          />
          <label htmlFor="only-nfc" className="text-sm text-slate-600">
            Hanya tampilkan yang ada NFC
          </label>
        </div>
      </div>

      <Separator className="my-6" />

      {/* --- FILTER BRAND --- */}
      <div className="space-y-3">
        <Label className="text-xs font-bold text-slate-400 uppercase">Brand</Label>
        <div className="space-y-3 max-h-75 overflow-y-auto pr-2 custom-scrollbar">
          {brands.length > 0 ? (
            brands.map((brand) => (
              <div key={brand.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`brand-${brand.id}`} 
                  checked={selectedBrands.includes(brand.slug)}
                  onCheckedChange={() => handleBrandChange(brand.slug)}
                />
                <label
                  htmlFor={`brand-${brand.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-600 hover:text-blue-600"
                >
                  {brand.nama_brand}
                </label>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic">Memuat brand...</p>
          )}
        </div>
      </div>
    </div>
  );
}
