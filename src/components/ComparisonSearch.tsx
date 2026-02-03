"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Loader2, Smartphone } from "lucide-react";
import Image from "next/image";
import { Produk, ApiResponse } from "@/types";

interface ComparisonSearchProps {
  onSelect: (slug: string) => void;
  onClose: () => void;
  excludeSlug?: string;
}

// --- HELPER: LOGIKA GAMBAR HYBRID (FIXED) ---
const getImageUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  
  // 1. Jika data lama (Link Eksternal)
  if (typeof path === 'string' && (path.startsWith("http") || path.startsWith("https"))) {
    return path;
  }
  
  // 2. Jika data baru (Upload dari Filament)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  
  try {
    const urlObj = new URL(apiUrl);
    const baseUrl = urlObj.origin; 
    const cleanPath = path?.startsWith('/') ? path.substring(1) : path;
    return `${baseUrl}/storage/${cleanPath}`;
  } catch (e) {
    // Fallback aman jika URL env error
    return `http://127.0.0.1:8000/storage/${path}`;
  }
};

export default function ComparisonSearch({ onSelect, onClose, excludeSlug }: ComparisonSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        searchProducts(query);
      } else {
        setResults([]);
      }
    }, 500); // Tunggu 500ms setelah user selesai mengetik

    return () => clearTimeout(timer);
  }, [query]);

  async function searchProducts(keyword: string) {
    setLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    try {
      // Panggil API Search Laravel
      const res = await fetch(`${apiUrl}/products?search=${keyword}`);
      const data: ApiResponse<Produk[]> = await res.json();
      
      if (data.status === 'success') {
        // Filter agar produk yang sedang dibandingkan tidak muncul lagi di pencarian
        const filtered = data.data.filter(p => p.slug !== excludeSlug);
        setResults(filtered);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute top-0 left-0 w-full h-full bg-white z-50 p-4 rounded-xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
      
      {/* Header Pencarian */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            autoFocus
            placeholder="Cari HP (cth: Redmi Note 13)..." 
            className="pl-9 bg-slate-50 border-slate-200"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <X className="w-5 h-5 text-slate-500" />
        </Button>
      </div>

      {/* Hasil Pencarian */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs">Mencari...</span>
          </div>
        ) : results.length > 0 ? (
          results.map((product) => {
            const imgUrl = getImageUrl(product.foto); // Pakai Helper

            return (
              <div 
                key={product.id}
                onClick={() => onSelect(product.slug)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-100 group"
              >
                {/* Thumbnail Gambar */}
                <div className="w-12 h-12 relative bg-white rounded-md border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {imgUrl ? (
                    <Image 
                      src={imgUrl}
                      alt={product.nama_produk}
                      fill
                      className="object-contain p-1 group-hover:scale-110 transition-transform"
                      sizes="48px"
                      unoptimized={true} // <--- WAJIB: Agar tidak error SSRF Localhost
                    />
                  ) : (
                    <Smartphone className="w-5 h-5 text-slate-300" />
                  )}
                </div>
                
                {/* Info Produk */}
                <div>
                  <h4 className="font-bold text-sm text-slate-900 line-clamp-1 group-hover:text-blue-600">
                    {product.nama_produk}
                  </h4>
                  <div className="text-[10px] text-slate-500 flex gap-2">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{product.tahun_rilis}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : query.length >= 2 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <span className="text-sm">Tidak ditemukan</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-slate-300">
            <Search className="w-8 h-8 mb-2 opacity-20" />
            <span className="text-xs">Ketik minimal 2 huruf</span>
          </div>
        )}
      </div>
    </div>
  );
}