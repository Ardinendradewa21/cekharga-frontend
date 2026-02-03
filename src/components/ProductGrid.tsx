"use client";

import { useState } from "react";
import { Produk } from "@/types";
import ProductCard from "./ProductCard";
import { Button } from "@/components/ui/button";
import { X, Zap } from "lucide-react";
import Link from "next/link";

interface ProductGridProps {
  products: Produk[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  // State untuk menyimpan slug HP yang dipilih (maksimal 2)
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

  const handleCompare = (slug: string) => {
    setSelectedSlugs((prev) => {
      // Kalau sudah ada, hapus (Toggle Off)
      if (prev.includes(slug)) {
        return prev.filter((s) => s !== slug);
      }
      // Kalau belum ada, cek limit max 2
      if (prev.length >= 2) {
        alert("Maksimal pilih 2 HP untuk dibandingkan!"); // Bisa ganti toast
        return prev;
      }
      // Tambahkan
      return [...prev, slug];
    });
  };

  const resetSelection = () => setSelectedSlugs([]);

  return (
    <>
      {/* --- GRID UTAMA --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 pb-24">
        {products.map((hp) => (
          <ProductCard 
            key={hp.id} 
            product={hp} 
            onCompare={handleCompare}
            isSelected={selectedSlugs.includes(hp.slug)}
          />
        ))}
      </div>

      {/* --- FLOATING ACTION BAR (Muncul kalau ada yang dipilih) --- */}
      {selectedSlugs.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300 w-full max-w-lg px-4">
          <div className="bg-slate-900/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between gap-4">
            
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Mode Versus
              </span>
              <span className="font-bold">
                {selectedSlugs.length} HP Dipilih
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetSelection}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" /> Batal
              </Button>

              {/* Tombol Eksekusi Duel */}
              <Button 
                disabled={selectedSlugs.length < 2}
                className={`gap-2 font-bold transition-all ${
                    selectedSlugs.length === 2 
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30" 
                    : "bg-slate-700 text-slate-400 cursor-not-allowed"
                }`}
                asChild={selectedSlugs.length === 2} // Render sebagai Link kalau aktif
              >
                {selectedSlugs.length === 2 ? (
                  <Link href={`/bandingkan?hp1=${selectedSlugs[0]}&hp2=${selectedSlugs[1]}`}>
                    <Zap className="w-4 h-4 fill-white" />
                    Mulai Duel!
                  </Link>
                ) : (
                  <span>Pilih 1 Lagi</span>
                )}
              </Button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}