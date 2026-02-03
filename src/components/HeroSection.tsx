"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, Loader2, Smartphone, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { Produk, ApiResponse } from "@/types";

// --- 1. LOGIC GAMBAR (DIPERBAIKI & DISAMAKAN DENGAN CARD) ---
const getImageUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  
  // Jika path sudah full URL (https://...), langsung pakai
  if (path.startsWith("http") || path.startsWith("https")) return path;
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  
  try {
    // Ambil origin (http://127.0.0.1:8000) tanpa /api
    const urlObj = new URL(apiUrl);
    const baseUrl = urlObj.origin; 
    
    // Bersihkan path dari slash depan ganda
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    // Gabungkan dengan folder storage
    return `${baseUrl}/storage/${cleanPath}`;
  } catch (e) {
    // Fallback darurat
    return `http://127.0.0.1:8000/storage/${path}`;
  }
};

const formatRupiah = (num: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
};

export default function HeroSection() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Produk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounce Search Logic
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      setShowDropdown(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const res = await fetch(`${apiUrl}/products?search=${query}`);
        const json: ApiResponse<Produk[]> = await res.json();
        
        if (json.status === 'success') {
          setResults(json.data.slice(0, 5)); 
        }
      } catch (error) {
        console.error("Live search error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDropdown(false);
    if (query.trim()) {
      router.push(`/?search=${query}`);
    }
  };

  return (
    <section className="relative bg-white pt-10 pb-16 md:pt-20 md:pb-24">
      
      {/* Background Blobs (Isolated Layer) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full">
            <div className="absolute top-0 right-0 w-125 h-125 bg-blue-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-125 h-125 bg-indigo-100/50 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10 text-center flex flex-col items-center">
        
        <Badge variant="secondary" className="mb-6 px-4 py-1.5 rounded-full border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors animate-in fade-in slide-in-from-bottom-4 duration-700">
          <TrendingUp className="w-3 h-3 mr-2" />
          Database Harga HP Terlengkap 2025
        </Badge>

        <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight mb-6 leading-tight max-w-4xl">
          Bandingkan Harga & Spek <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">
            Tanpa Buka Banyak Tab
          </span>
        </h1>

        <p className="text-slate-500 text-lg md:text-xl mb-10 max-w-2xl leading-relaxed">
          Cek harga termurah dari Shopee, Tokopedia, dan lainnya. 
          Temukan HP terbaik sesuai budgetmu dalam hitungan detik.
        </p>

        {/* --- SEARCH BAR WRAPPER --- */}
        <div className="w-full max-w-xl relative" ref={searchContainerRef}>
          
          <form onSubmit={handleSearchSubmit} className="relative z-60">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            
            <Input 
              type="text"
              placeholder="Ketik 'Poco', 'Samsung', 'iPhone'..."
              className="w-full h-14 pl-12 pr-32 rounded-full border-slate-200 shadow-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-base bg-white"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if(results.length > 0) setShowDropdown(true); }}
            />
            
            <div className="absolute inset-y-1 right-1">
              <Button type="submit" size="lg" className="h-12 rounded-full px-6 bg-slate-900 hover:bg-blue-600 transition-all">
                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Cari"}
              </Button>
            </div>
          </form>

          {/* --- DROPDOWN LIVE SEARCH (Z-INDEX 100) --- */}
          {showDropdown && (
            <div className="absolute top-full left-0 w-full mt-3 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-100 text-left animate-in fade-in zoom-in-95 duration-200 ring-1 ring-slate-200">
              
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                 <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hasil Pencarian</span>
                 {isLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
              </div>

              {results.length > 0 ? (
                <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                  <div className="divide-y divide-slate-50">
                    {results.map((product) => {
                      // 2. GUNAKAN LOGIC GAMBAR BARU DISINI
                      const imgUrl = getImageUrl(product.foto);
                      
                      return (
                        <Link 
                          key={product.id} 
                          href={`/produk/${product.slug}`} 
                          onClick={() => setShowDropdown(false)}
                          className="flex items-center gap-4 p-4 hover:bg-blue-50/50 transition-colors group"
                        >
                          {/* Container Gambar */}
                          <div className="w-12 h-14 relative shrink-0 bg-white rounded border border-slate-100 p-1 flex items-center justify-center overflow-hidden">
                            {imgUrl ? (
                              <Image 
                                src={imgUrl} 
                                alt={product.nama_produk} 
                                // Gunakan fill + object-contain agar gambar pas di kotak
                                fill
                                sizes="48px"
                                className="object-contain p-1" 
                                unoptimized={true} // PENTING: Mencegah error timeout next/image
                              />
                            ) : (
                              <Smartphone className="w-6 h-6 text-slate-300" />
                            )}
                          </div>

                          <div className="grow min-w-0">
                            <div className="font-bold text-slate-800 text-sm truncate group-hover:text-blue-700">
                              {product.nama_produk}
                            </div>
                            <div className="text-xs text-slate-500 font-medium">
                              {product.harga_terendah_baru 
                                ? formatRupiah(product.harga_terendah_baru) 
                                : "Cek Stok"}
                            </div>
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                  
                  <div 
                    onClick={handleSearchSubmit}
                    className="p-3 text-center text-xs font-bold text-blue-600 hover:bg-blue-50 cursor-pointer border-t border-slate-100 bg-slate-50/50 sticky bottom-0 backdrop-blur-sm"
                  >
                    Lihat semua hasil untuk {query}
                  </div>
                </div>
              ) : (
                !isLoading && (
                  <div className="p-8 text-center">
                    <div className="inline-flex bg-slate-50 p-3 rounded-full mb-2">
                       <Search className="w-5 h-5 text-slate-300" />
                    </div>
                    <p className="text-slate-500 text-sm">Tidak ditemukan HP dengan nama {query}</p>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm text-slate-500">
          <span>Populer:</span>
          <button onClick={() => { setQuery("iPhone"); router.push('/?search=iPhone'); }} className="hover:text-blue-600 underline decoration-dotted">iPhone</button>
          <button onClick={() => { setQuery("Samsung"); router.push('/?search=Samsung'); }} className="hover:text-blue-600 underline decoration-dotted">Samsung</button>
          <button onClick={() => { setQuery("Xiaomi"); router.push('/?search=Xiaomi'); }} className="hover:text-blue-600 underline decoration-dotted">Xiaomi</button>
        </div>

      </div>
    </section>
  );
}