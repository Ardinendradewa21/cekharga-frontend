"use client";

import { useState, useEffect } from "react";
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
}

interface FilterSidebarProps {
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

const PRICE_RANGE_OPTIONS = [
  { value: "", label: "Semua Harga", min: "", max: "" },
  { value: "under-2000000", label: "Di bawah Rp 2 juta", min: "", max: "2000000" },
  { value: "2000000-3000000", label: "Rp 2 juta - Rp 3 juta", min: "2000000", max: "3000000" },
  { value: "3000000-5000000", label: "Rp 3 juta - Rp 5 juta", min: "3000000", max: "5000000" },
  { value: "5000000-7000000", label: "Rp 5 juta - Rp 7 juta", min: "5000000", max: "7000000" },
  { value: "7000000-10000000", label: "Rp 7 juta - Rp 10 juta", min: "7000000", max: "10000000" },
  { value: "above-10000000", label: "Di atas Rp 10 juta", min: "10000000", max: "" },
] as const;

export default function FilterSidebar({ onFilterChange, className }: FilterSidebarProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState("");
  const [useCase, setUseCase] = useState("");

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
    applyFilter(updated, priceRange, useCase);
  };

  // 3. Logic Reset
  const handleReset = () => {
    setSelectedBrands([]);
    setPriceRange("");
    setUseCase("");
    applyFilter([], "", "");
  };

  // 4. Helper kirim data
  const applyFilter = (
    brands: string[],
    rangeValue: string,
    useCaseValue: string,
  ) => {
    const selectedRange = PRICE_RANGE_OPTIONS.find((option) => option.value === rangeValue) ?? PRICE_RANGE_OPTIONS[0];

    onFilterChange({
      brands: brands.join(","),
      min_price: selectedRange.min,
      max_price: selectedRange.max,
      use_case: useCaseValue,
    });
  };

  return (
    <div
      className={cn(
        "h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm",
        className,
      )}
    >
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
        {/* Dropdown preset dipilih agar user tidak perlu mengetik angka manual
            dan panel filter tetap pendek di desktop maupun mobile. */}
        <select
          value={priceRange}
          onChange={(event) => {
            const nextValue = event.target.value;
            setPriceRange(nextValue);
            applyFilter(selectedBrands, nextValue, useCase);
          }}
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
        >
          {PRICE_RANGE_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
            applyFilter(selectedBrands, priceRange, nextValue);
          }}
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">Semua Kebutuhan</option>
          <option value="gaming">Gaming (AnTuTu tinggi)</option>
          <option value="camera">Fotografi (kamera utama &gt;= 50MP)</option>
          <option value="battery">Baterai Awet (&gt;= 5000mAh)</option>
          <option value="daily">Harian Komplit (NFC + baterai besar)</option>
        </select>
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
