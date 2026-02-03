"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import Footer from "@/components/Footer";
import FilterSidebar, { FilterState } from "@/components/FilterSidebar";
import MobileFilter from "@/components/MobileFilter";
import Pagination from "@/components/Pagination";
import HeroSection from "@/components/HeroSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Smartphone, Loader2 } from "lucide-react"; 
import { Produk, ApiResponse } from "@/types";
import Link from "next/link";

function HomeContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search");

  const [products, setProducts] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- STATE PENCARIAN & FILTER ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({ brands: "", min_price: "", max_price: "" });
  const [sortOption, setSortOption] = useState("terbaru");

  // --- STATE UI ---
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [compareList, setCompareList] = useState<string[]>([]);
  
  // 🔥 STATE BARU: UNTUK MENGONTROL SEARCH BAR KECIL
  const [showStickySearch, setShowStickySearch] = useState(false);

  // 0. LOGIC SCROLL LISTENER (Agar Search Bar Kecil Muncul Saat Scroll)
  useEffect(() => {
    const handleScroll = () => {
      // Jika scroll lebih dari 400px (melewati Hero), tampilkan search kecil
      if (window.scrollY > 350) {
        setShowStickySearch(true);
      } else {
        setShowStickySearch(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 1. SINKRONISASI URL
  useEffect(() => {
    if (urlSearch) {
      setSearchQuery(urlSearch);
      // Auto scroll ke hasil jika ada search dari URL
      setTimeout(() => {
         const section = document.getElementById("product-section");
         if(section) section.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [urlSearch]);

  // 2. Fetch Data (Tetap Sama)
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const params = new URLSearchParams();
        
        if (searchQuery) params.append("search", searchQuery);
        if (filters.brands) params.append("brands", filters.brands);
        if (filters.min_price) params.append("min_price", filters.min_price);
        if (filters.max_price) params.append("max_price", filters.max_price);
        
        params.append("sort", sortOption);
        params.append("page", page.toString());

        const res = await fetch(`${apiUrl}/products?${params.toString()}`);
        const result: ApiResponse<Produk[]> & { meta?: { last_page: number } } = await res.json();
        
        if(result.status === 'success') {
           setProducts(result.data);
           if (result.meta) setLastPage(result.meta.last_page);
        }
      } catch (error) {
        console.error("Gagal ambil data:", error);
      } finally {
        setLoading(false);
      }
    }

    const timeoutId = setTimeout(() => fetchProducts(), 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, filters, sortOption, page]); 

  // Reset Page saat Filter Berubah
  useEffect(() => { setPage(1); }, [searchQuery, filters, sortOption]);

  const toggleCompare = (slug: string) => {
    setCompareList(prev => {
      if (prev.includes(slug)) return prev.filter(s => s !== slug);
      if (prev.length >= 2) return [prev[1], slug]; 
      return [...prev, slug];
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    document.getElementById("product-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
      
      {/* NAVBAR SIMPLE */}
      <nav className="bg-white border-b border-slate-100 py-4 relative z-50">
        <div className="container mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setSearchQuery(""); window.scrollTo(0,0); }}>
                <div className="bg-blue-600 p-1.5 rounded-lg">
                    <Smartphone className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                    CekHarga<span className="text-blue-600">.</span>
                </h1>
            </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="relative z-40">
        <HeroSection />
      </div>
      

      {/* STICKY SEARCH & FILTER BAR */}
      <div id="product-section" className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all py-3">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            
            {/* --- SEARCH BAR KECIL (SCROLL-AWARE) --- */}
            {/* Logic: Opacity 0 kalau di atas, Opacity 100 kalau scroll ke bawah */}
            <div className={`relative w-full md:max-w-md group transition-all duration-300 ${showStickySearch ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-2 invisible'}`}>
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <Input 
                  type="text" 
                  placeholder="Cari HP di sini..." 
                  className="pl-10 h-10 rounded-full border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm shadow-sm transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
            </div>

            {/* SORTING & COUNT (SELALU MUNCUL) */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                <span className="text-xs text-slate-500 hidden sm:inline-block">
                    Menampilkan <span className="font-bold text-slate-900">{products.length}</span> produk
                </span>
                
                <div className="flex items-center gap-2">
                    <div className="lg:hidden">
                        <MobileFilter onFilterChange={(newFilters) => setFilters(prev => ({...prev, ...newFilters}))} />
                    </div>
                    
                    <select 
                        className="bg-white border border-slate-200 text-xs sm:text-sm rounded-lg p-2 pr-8 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer h-10"
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                    >
                        <option value="terbaru">Terbaru</option>
                        <option value="termurah">Harga Termurah</option>
                        <option value="termahal">Harga Termahal</option>
                        <option value="antutu">Performa (AnTuTu)</option>
                    </select>
                </div>
            </div>

          </div>
        </div>
      </div>

      {/* FLOATING COMPARE BUTTON */}
      {compareList.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in">
           <div className="bg-slate-900 text-white p-2 pl-6 pr-2 rounded-full shadow-2xl flex items-center gap-4 ring-4 ring-white/20 backdrop-blur-sm">
              <span className="font-bold text-sm">
                {compareList.length} HP Dipilih
              </span>
              {compareList.length === 2 ? (
                <Link href={`/bandingkan?hp1=${compareList[0]}&hp2=${compareList[1]}`}>
                  <Button size="sm" className="rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold px-6">
                    VS Tarung
                  </Button>
                </Link>
              ) : (
                <Button size="sm" disabled className="rounded-full bg-slate-700 text-slate-400">
                  Pilih 1 Lagi
                </Button>
              )}
              <button onClick={() => setCompareList([])} className="bg-slate-800 hover:bg-red-600 p-1.5 rounded-full transition-colors ml-1">
                <X className="w-3 h-3" />
              </button>
           </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="grow container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          <div className="hidden lg:block lg:col-span-1 h-fit sticky top-24">
             <FilterSidebar onFilterChange={(newFilters) => setFilters(prev => ({...prev, ...newFilters}))} />
          </div>

          <div className="lg:col-span-3">
             {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-80 bg-slate-200/50 rounded-3xl animate-pulse" />
                  ))}
                </div>
             ) : (
                <>
                  {products.length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {products.map((product) => (
                          <ProductCard 
                            key={product.id} 
                            product={product} 
                            isSelected={compareList.includes(product.slug)}
                            onCompare={toggleCompare}
                          />
                        ))}
                      </div>
                      <Pagination 
                        currentPage={page}
                        lastPage={lastPage}
                        onPageChange={handlePageChange}
                        isLoading={loading}
                      />
                    </>
                  ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                      <div className="inline-flex bg-slate-50 p-6 rounded-full mb-4">
                         <Search className="w-10 h-10 text-slate-300" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-700">Tidak ditemukan</h3>
                      <p className="text-slate-500">Coba atur ulang filter atau kata kunci lain.</p>
                      <Button 
                        variant="link" 
                        className="mt-2 text-blue-600"
                        onClick={() => { setSearchQuery(""); setFilters({ brands: "", min_price: "", max_price: "" }); }}
                      >
                        Reset Semua Filter
                      </Button>
                    </div>
                  )}
                </>
             )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
      <HomeContent />
    </Suspense>
  )
}