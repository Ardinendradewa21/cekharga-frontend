import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Produk } from "@/types";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Smartphone, Scale } from "lucide-react"; // Hapus Tag, History
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Produk;
  isSelected?: boolean;
  onCompare?: (slug: string) => void;
}

// --- HELPER: LOGIKA GAMBAR HYBRID ---
const getImageUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  
  if (typeof path === 'string' && (path.startsWith("http") || path.startsWith("https"))) {
    return path;
  }
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  
  try {
    const urlObj = new URL(apiUrl);
    const baseUrl = urlObj.origin; 
    
    const cleanPath = path?.startsWith('/') ? path.substring(1) : path;
    return `${baseUrl}/storage/${cleanPath}`;
  } catch (e) {
    return `http://127.0.0.1:8000/storage/${path}`;
  }
};

export default function ProductCard({ product, isSelected, onCompare }: ProductCardProps) {
  const formatRupiah = (number: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(number).replace("Rp", "Rp ");
  };

  const imageUrl = getImageUrl(product.foto);
  // Logic ambil logo brand (pastikan relasi brand diload di backend)
  const brandLogoUrl = product.brand?.logo ? getImageUrl(product.brand.logo) : null;

  return (
    <Link href={`/produk/${product.slug}`} className="group h-full block cursor-pointer">
      <Card className={cn(
        "h-full flex flex-col overflow-hidden border-slate-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl",
        isSelected ? "ring-2 ring-blue-600 border-blue-600" : ""
      )}>
        
        {/* --- HEADER GAMBAR --- */}
        <div className="relative h-40 md:h-52 bg-white flex items-center justify-center overflow-hidden p-4 md:p-6 border-b border-slate-50">
          
          {/* Tombol Bandingkan (Kiri Atas) */}
          {onCompare && (
            <div 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCompare(product.slug);
              }}
              className={cn(
                "absolute top-2 left-2 z-20 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 shadow-sm select-none backdrop-blur-sm",
                isSelected 
                  ? "bg-blue-600 text-white border border-blue-600" 
                  : "bg-white/90 text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-300"
              )}
            >
              <Scale className="w-3 h-3" />
              <span className="hidden md:inline">{isSelected ? "Terpilih" : "Bandingkan"}</span>
              <span className="md:hidden">{isSelected ? "✔" : "+"}</span>
            </div>
          )}

          {/* --- LOGO BRAND (Selalu Bulat & Rapi) --- */}
          {brandLogoUrl ? (
             // Kontainer Bulat dengan Border & Shadow Halus
             <div className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
                <Image 
                  src={brandLogoUrl} 
                  alt={product.brand?.nama_brand || "brand"}
                  width={36} 
                  height={36} 
                  // object-contain agar gambar asli masuk pas, p-1.5 agar ada jarak dari pinggir lingkaran
                  className="object-contain p-1.5 w-full h-full" 
                  unoptimized
                />
             </div>
          ) : (
             // Fallback jika tidak ada logo, tampilkan badge tahun di sini
             <Badge variant="secondary" className="absolute top-2 right-2 text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 px-1.5 md:px-2">
               {product.tahun_rilis}
             </Badge>
          )}

          {/* Badge Tahun (Pindah ke Bawah Kanan jika ada logo brand) */}
          {brandLogoUrl && (
             <Badge variant="secondary" className="absolute bottom-2 right-2 text-[10px] font-medium bg-slate-50/80 backdrop-blur text-slate-500 border border-slate-200 px-1.5">
               {product.tahun_rilis}
             </Badge>
          )}

          {/* Gambar Produk */}
          {imageUrl ? (
            <div className="relative w-full h-full group-hover:scale-105 transition-transform duration-500">
              <Image 
                src={imageUrl} 
                alt={product.nama_produk} 
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 33vw"
                unoptimized={true}
              />
            </div>
          ) : (
            <div className="bg-slate-50 p-3 rounded-full">
              <Smartphone className="w-8 h-8 md:w-12 md:h-12 text-slate-300" />
            </div>
          )}
        </div>

        {/* --- ISI KONTEN (LAYOUT BARU CLEAN) --- */}
        <CardContent className="p-3 md:p-4 grow flex flex-col">
          
          {/* Judul */}
          <h3 className="font-bold text-sm md:text-lg text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight min-h-[2.5em] md:min-h-12">
            {product.nama_produk}
          </h3>

          <div className="mt-auto pt-3">
            {/* Garis Pemisah Tipis */}
            <div className="w-full h-px bg-slate-100 mb-2" />

            {/* Harga Baru (Spotlight: Hitam Tebal) */}
            <div className="text-lg md:text-xl font-black text-slate-900 tracking-tight leading-none">
                {product.harga_terendah_baru ? formatRupiah(product.harga_terendah_baru) : "Cek Stok"}
            </div>

            {/* Harga Bekas (Secondary: Kecil Abu) */}
            <div className="text-[10px] md:text-xs text-slate-500 font-medium mt-1">
               est. bekas {product.harga_terendah_bekas ? formatRupiah(product.harga_terendah_bekas) : "-"}
            </div>
          </div>

        </CardContent>

        {/* --- FOOTER TOMBOL (TETAP SAMA) --- */}
        <CardFooter className="p-4 pt-0 hidden md:flex">
           <div className={cn(
             buttonVariants({ variant: "ghost", size: "sm" }), 
             "w-full text-xs font-bold text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-all border border-slate-200 justify-between px-4"
           )}>
             <span>Lihat Detail</span>
             <ArrowUpRight className="w-3 h-3 opacity-50 group-hover:opacity-100" />
           </div>
        </CardFooter>
      </Card>
    </Link>
  );
}