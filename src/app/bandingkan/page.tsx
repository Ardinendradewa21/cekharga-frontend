"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Produk } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Smartphone, Battery, Camera, Cpu, Monitor, Repeat, Check, X as XIcon, Volume2, Wifi } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import ComparisonSearch from "@/components/ComparisonSearch";

// --- HELPERS ---

const formatRupiah = (num?: number) => {
  if (!num) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
};

// Logic Gambar Hybrid
const getImageUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (typeof path === 'string' && (path.startsWith("http") || path.startsWith("https"))) return path;
  const cleanPath = path?.startsWith('/') ? path.substring(1) : path;
  if (cleanPath?.startsWith("uploads/")) return `/${cleanPath}`;
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  
  try {
    const urlObj = new URL(apiUrl);
    const baseUrl = urlObj.origin; 
    return `${baseUrl}/storage/${cleanPath}`;
  } catch {
    return `http://127.0.0.1:8000/storage/${path}`;
  }
};

const getWinnerClass = (val1: number | undefined, val2: number | undefined) => {
  if (val1 === undefined || val2 === undefined) return "text-slate-900";
  if (val1 > val2) return "text-green-700 font-bold bg-green-50/50 rounded px-1 -ml-1"; 
  if (val1 < val2) return "text-slate-500";
  return "text-slate-700";
};

// --- HELPER: FORMAT VARIAN JADI BADGE ---
const renderVarian = (data: unknown) => {
  if (!data) return <span className="text-slate-400">-</span>;

  let items: string[] = [];

  if (Array.isArray(data)) {
    items = data;
  } else if (typeof data === 'string') {
    try {
      if (data.trim().startsWith('[')) {
         items = JSON.parse(data);
      } else {
         items = data.split(',').map(s => s.trim());
      }
    } catch {
      items = [data]; 
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, idx) => (
        <span 
          key={idx} 
          className="px-2 py-0.5 text-[10px] md:text-xs font-bold bg-slate-100 text-slate-700 rounded border border-slate-200 whitespace-nowrap"
        >
          {item.replace(/[\[\]"]/g, '')}
        </span>
      ))}
    </div>
  );
};

const cleanArrayString = (val: unknown): string => {
  if (typeof val === 'string' && (val.startsWith('[') || val.includes('"'))) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.join(", ");
    } catch {
      return val.replace(/[\[\]"]/g, '').replace(/,/g, ', ');
    }
  }
  return val ? String(val) : "-";
}

// --- KOMPONEN UTAMA ---
function ComparisonContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [hp1, setHp1] = useState<Produk | null>(null);
  const [hp2, setHp2] = useState<Produk | null>(null);
  const [loading, setLoading] = useState(true);

  const [isSearching1, setIsSearching1] = useState(false);
  const [isSearching2, setIsSearching2] = useState(false);

  const slug1 = searchParams.get("hp1");
  const slug2 = searchParams.get("hp2");

  useEffect(() => {
    async function fetchData() {
      if (!slug1 && !slug2) {
        setLoading(false);
        setHp1(null);
        setHp2(null);
        return;
      }

      setLoading(true);
      try {
        const [res1, res2] = await Promise.all([
          slug1 ? fetch(`/api/products/${slug1}`).then(r => r.json()) : Promise.resolve(null),
          slug2 ? fetch(`/api/products/${slug2}`).then(r => r.json()) : Promise.resolve(null)
        ]);
        if (res1?.success || res1?.status === 'success') setHp1(res1.data);
        if (res2?.success || res2?.status === 'success') setHp2(res2.data);
      } catch (error) {
        console.error("Error fetching comparison data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug1, slug2]);

  const handleReplace = (pos: 1 | 2, newSlug: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set(pos === 1 ? "hp1" : "hp2", newSlug);
    router.push(`/bandingkan?${newParams.toString()}`);
    setIsSearching1(false);
    setIsSearching2(false);
  };

  const renderBoolean = (val?: boolean) => {
    if (val === undefined || val === null) return "-";
    return val ? (
      <span className="flex items-center gap-1 text-green-700 font-medium">
        <Check className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden md:inline">Ya</span>
      </span>
    ) : (
      <span className="flex items-center gap-1 text-slate-400">
        <XIcon className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden md:inline">Tidak</span>
      </span>
    );
  };

  // Helper render baris tabel
  const renderRow = (label: string, val1: unknown, val2: unknown, type: 'text' | 'number' | 'boolean' | 'variant' = 'text') => {
    
    let content1: React.ReactNode;
    let content2: React.ReactNode;
    
    let style1 = "text-slate-900";
    let style2 = "text-slate-900";

    // LOGIC RENDER KONTEN
    if (type === 'variant') {
        content1 = renderVarian(val1);
        content2 = renderVarian(val2);
    } else if (type === 'boolean') {
        content1 = renderBoolean(val1 as boolean | undefined);
        content2 = renderBoolean(val2 as boolean | undefined);
    } else {
        content1 = cleanArrayString(val1);
        content2 = cleanArrayString(val2);
    }

    // LOGIC WARNA (Hanya untuk Number)
    if (type === 'number') {
        const num1 = typeof val1 === 'number' ? val1 : parseFloat(val1 as string);
        const num2 = typeof val2 === 'number' ? val2 : parseFloat(val2 as string);

        if (!isNaN(num1) && !isNaN(num2)) {
            style1 = getWinnerClass(num1, num2);
            style2 = getWinnerClass(num2, num1);
        }
    }

    return (
      <div className="grid grid-cols-3 gap-2 md:gap-4 py-3 md:py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors px-4 md:px-6">
        <div className="col-span-1 text-[10px] md:text-sm text-slate-500 font-medium flex items-center pr-2">
          {label}
        </div>
        <div className={`col-span-1 text-[11px] md:text-base leading-tight break-words flex items-center ${type !== 'boolean' && type !== 'variant' ? style1 : ''}`}>
          {content1}
        </div>
        <div className={`col-span-1 text-[11px] md:text-base leading-tight break-words flex items-center ${type !== 'boolean' && type !== 'variant' ? style2 : ''}`}>
          {content2}
        </div>
      </div>
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">Menyiapkan Arena...</div>;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20 font-sans">
      
      {/* Navbar Clean */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 md:h-16 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="hover:bg-slate-100 rounded-full text-slate-600 h-8 w-8 md:h-10 md:w-10">
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          </Link>
          <h1 className="font-semibold text-sm md:text-lg text-slate-900">Perbandingan Spesifikasi</h1>
        </div>
      </div>

      <div className="container mx-auto px-2 md:px-4 py-4 md:py-8 max-w-5xl">
        
        {/* Header Produk (VS HEADER) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-8 items-start sticky top-14 bg-[#F8F9FA]/95 backdrop-blur-md py-2 md:static md:bg-transparent z-30">
          
          <div className="hidden md:block col-span-1 pt-10">
            <h3 className="font-bold text-slate-400 text-xs uppercase tracking-widest">Device</h3>
          </div>

          {[
            { data: hp1, setSearch: setIsSearching1, isSearch: isSearching1, pos: 1 },
            { data: hp2, setSearch: setIsSearching2, isSearch: isSearching2, pos: 2 }
          ].map((item, idx) => (
            <div key={idx} className="col-span-1 relative">
              <div className="bg-white p-3 md:p-6 rounded-xl shadow-sm border border-slate-200 text-center relative h-full flex flex-col justify-between">
                
                {/* Tombol Ganti HP */}
                <button 
                  onClick={() => item.setSearch(!item.isSearch)}
                  className="absolute top-2 right-2 p-1.5 md:p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-full transition-colors z-10"
                >
                  <Repeat className="w-3 h-3 md:w-4 md:h-4" />
                </button>
                
                {item.isSearch && (
                  <ComparisonSearch 
                    onSelect={(slug) => handleReplace(item.pos as 1|2, slug)} 
                    onClose={() => item.setSearch(false)}
                    excludeSlug={idx === 0 ? hp2?.slug : hp1?.slug} 
                  />
                )}

                <div>
                    {/* Gambar (Hybrid Logic) */}
                    <div className="h-24 md:h-40 relative mb-2 md:mb-4 flex items-center justify-center">
                    {getImageUrl(item.data?.foto || null) ? (
                        <Image 
                            src={getImageUrl(item.data!.foto)!} 
                            alt={item.data!.nama_produk} 
                            fill 
                            className="object-contain" 
                            unoptimized={true}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-slate-300">
                        <Smartphone className="w-8 h-8 md:w-10 md:h-10 mb-1" />
                        <span className="text-[10px] md:text-xs">Pilih HP</span>
                        </div>
                    )}
                    </div>
                    
                    {/* Nama HP */}
                    <h2 className="font-bold text-slate-900 text-xs md:text-lg mb-2 leading-tight line-clamp-2 min-h-[2.5em] md:min-h-[1.5em] flex items-center justify-center">
                    {item.data?.nama_produk || "-"}
                    </h2>
                </div>
                
                {/* --- UPDATE: TAMPILAN HARGA (PRIORITAS HARGA BARU) --- */}
                {item.data && (
                  <div className="flex flex-col gap-1 items-center mt-auto">
                     {/* Harga Baru (Utama) */}
                     {item.data.harga_terendah_baru > 0 ? (
                        <div className="text-blue-600 font-black text-sm md:text-xl leading-none">
                           {formatRupiah(item.data.harga_terendah_baru)}
                        </div>
                     ) : (
                        <div className="text-slate-300 font-bold text-xs md:text-sm">Stok Habis</div>
                     )}

                     {/* Harga Bekas (Secondary) */}
                     {item.data.harga_terendah_bekas > 0 && (
                        <div className="text-[10px] md:text-xs text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded">
                           Bekas: {formatRupiah(item.data.harga_terendah_bekas)}
                        </div>
                     )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Tabel Spesifikasi Lengkap */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-sm">
          
          {/* 1. PERFORMA */}
          <div className="bg-slate-100/80 px-4 md:px-6 py-2 md:py-3 border-b border-slate-100 flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-widest mt-0">
            <Cpu className="w-3 h-3 md:w-4 md:h-4" /> Performa
          </div>
          <div>
            {renderRow("Chipset", hp1?.spesifikasi?.chipset, hp2?.spesifikasi?.chipset)}
            {renderRow("AnTuTu", hp1?.spesifikasi?.skor_antutu, hp2?.spesifikasi?.skor_antutu, 'number')}
            {renderRow("RAM/ROM", hp1?.spesifikasi?.varian_internal, hp2?.spesifikasi?.varian_internal, 'variant')}
            {renderRow("MicroSD", hp1?.spesifikasi?.ada_slot_memori, hp2?.spesifikasi?.ada_slot_memori, 'boolean')}
          </div>

          {/* 2. LAYAR */}
          <div className="bg-slate-100/80 px-4 md:px-6 py-2 md:py-3 border-y border-slate-100 flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-widest">
            <Monitor className="w-3 h-3 md:w-4 md:h-4" /> Layar
          </div>
          <div>
            {renderRow("Panel", hp1?.spesifikasi?.tipe_layar, hp2?.spesifikasi?.tipe_layar)}
            {renderRow("Ukuran", hp1?.spesifikasi?.ukuran_layar ? `${hp1.spesifikasi.ukuran_layar}"` : null, hp2?.spesifikasi?.ukuran_layar ? `${hp2.spesifikasi.ukuran_layar}"` : null)}
            {renderRow("Resolusi", hp1?.spesifikasi?.resolusi, hp2?.spesifikasi?.resolusi)}
          </div>

          {/* 3. KAMERA */}
          <div className="bg-slate-100/80 px-4 md:px-6 py-2 md:py-3 border-y border-slate-100 flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-widest">
            <Camera className="w-3 h-3 md:w-4 md:h-4" /> Kamera
          </div>
          <div>
            {renderRow("Utama", hp1?.spesifikasi?.kamera_utama_mp ? `${hp1.spesifikasi.kamera_utama_mp} MP` : null, hp2?.spesifikasi?.kamera_utama_mp ? `${hp2.spesifikasi.kamera_utama_mp} MP` : null)}
            {renderRow("Fitur", hp1?.spesifikasi?.detail_kamera_utama, hp2?.spesifikasi?.detail_kamera_utama)}
            {renderRow("Video Blkng", hp1?.spesifikasi?.kamera_utama_video, hp2?.spesifikasi?.kamera_utama_video)}
            {renderRow("Selfie", hp1?.spesifikasi?.kamera_selfie_mp ? `${hp1.spesifikasi.kamera_selfie_mp} MP` : null, hp2?.spesifikasi?.kamera_selfie_mp ? `${hp2.spesifikasi.kamera_selfie_mp} MP` : null)}
            {renderRow("Video Dpn", hp1?.spesifikasi?.kamera_selfie_video, hp2?.spesifikasi?.kamera_selfie_video)}
          </div>

          {/* 4. SOUND */}
          <div className="bg-slate-100/80 px-4 md:px-6 py-2 md:py-3 border-y border-slate-100 flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-widest">
            <Volume2 className="w-3 h-3 md:w-4 md:h-4" /> Sound
          </div>
          <div>
            {renderRow("Speaker", hp1?.spesifikasi?.sound_loudspeaker, hp2?.spesifikasi?.sound_loudspeaker)}
            {renderRow("3.5mm Jack", hp1?.spesifikasi?.sound_jack, hp2?.spesifikasi?.sound_jack, 'boolean')}
          </div>

          {/* 5. KONEKTIVITAS */}
          <div className="bg-slate-100/80 px-4 md:px-6 py-2 md:py-3 border-y border-slate-100 flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-widest">
            <Wifi className="w-3 h-3 md:w-4 md:h-4" /> Konektivitas
          </div>
          <div>
            {renderRow("WLAN", hp1?.spesifikasi?.comms_wlan, hp2?.spesifikasi?.comms_wlan)}
            {renderRow("Bluetooth", hp1?.spesifikasi?.comms_bluetooth, hp2?.spesifikasi?.comms_bluetooth)}
            {renderRow("GPS", hp1?.spesifikasi?.comms_gps, hp2?.spesifikasi?.comms_gps)}
            {renderRow("NFC", hp1?.spesifikasi?.ada_nfc, hp2?.spesifikasi?.ada_nfc, 'boolean')}
            {renderRow("USB", hp1?.spesifikasi?.comms_usb, hp2?.spesifikasi?.comms_usb)}
          </div>

          {/* 6. BATERAI */}
          <div className="bg-slate-100/80 px-4 md:px-6 py-2 md:py-3 border-y border-slate-100 flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-widest">
            <Battery className="w-3 h-3 md:w-4 md:h-4" /> Daya
          </div>
          <div className="pb-2 md:pb-6">
            {renderRow("Kapasitas", hp1?.spesifikasi?.kapasitas_baterai, hp2?.spesifikasi?.kapasitas_baterai, 'number')}
            {renderRow("Charging", hp1?.spesifikasi?.kecepatan_cas, hp2?.spesifikasi?.kecepatan_cas)}
          </div>

        </div>
      </div>
    </div>
  );
}

// Wrapper Suspense
export default function ComparisonPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-slate-500">Memuat data...</div>}>
      <ComparisonContent />
    </Suspense>
  )
}
