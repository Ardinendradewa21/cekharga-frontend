import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Produk } from "@/types";
import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, ArrowUpRight, Clock, Scale, ShoppingBag, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Produk;
  isSelected?: boolean;
  onCompare?: (slug: string) => void;
}

// Helper Time Ago (Singkat & Padat)
const timeAgo = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins}m lalu`;
  if (diffMins < 1440) return `${Math.floor(diffMins/60)}j lalu`;
  return `${Math.floor(diffMins/1440)}h lalu`;
};

// Helper Gambar
const getImageUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  if (cleanPath.startsWith("uploads/")) return `/${cleanPath}`;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  try {
    const baseUrl = new URL(apiUrl).origin;
    return `${baseUrl}/storage/${cleanPath}`;
  } catch { return null; }
};

export default function ProductCard({ product, isSelected, onCompare }: ProductCardProps) {
  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(number).replace("Rp", "Rp ");
  };

  const imageUrl = getImageUrl(product.foto);
  const brandLogoUrl = product.brand?.logo ? getImageUrl(product.brand.logo) : null;

  // --- LOGIC CARI HARGA TERMURAH DARI E-COMMERCE ---
  // Ambil semua link, urutkan dari harga terendah
  const sortedLinks = [...(product.marketplace_links || [])].sort((a, b) => a.harga - b.harga);
  const cheapestLink = sortedLinks.length > 0 ? sortedLinks[0] : null;

  // Tentukan Harga Display (Prioritas: E-commerce -> Harga Baru Manual -> Harga Bekas)
  const displayPrice = cheapestLink ? cheapestLink.harga : (product.harga_terendah_baru || 0);
  const displayLabel = cheapestLink ? `via ${cheapestLink.nama_marketplace || "Toko Online"}` : "Harga Pasar Baru";
  const hasEcommerce = !!cheapestLink;
  const priceSyncAt = product.price_last_updated_at || product.updated_at;
  const priceFreshness = product.price_data_status || "unknown";

  return (
    <Link href={`/produk/${product.slug}`} className="group h-full block cursor-pointer">
      <Card className={cn(
        "h-full flex flex-col overflow-hidden border-slate-200 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl relative",
        isSelected ? "ring-2 ring-blue-600 border-blue-600" : ""
      )}>
        
        {/* --- HEADER GAMBAR --- */}
        <div className="relative h-48 bg-white flex items-center justify-center overflow-hidden p-6 border-b border-slate-50">
          
          {/* BADGE UPDATE (Posisi: Pojok Kanan Atas - Lebih Rapi) */}
          {priceSyncAt && (
             <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white/80 backdrop-blur border border-slate-200 shadow-sm px-2 py-1 rounded-full text-[10px] font-bold text-slate-500">
                <Clock className={`w-3 h-3 ${priceFreshness === "stale" ? "text-amber-600" : "text-green-600"}`} />
                {timeAgo(priceSyncAt)}
             </div>
          )}

          {/* Tombol Bandingkan (Kiri Atas) */}
          {onCompare && (
            <div 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCompare(product.slug); }}
              className={cn(
                "absolute top-3 left-3 z-20 px-2.5 py-1.5 rounded-full text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 shadow-sm select-none backdrop-blur-sm",
                isSelected ? "bg-blue-600 text-white" : "bg-white/90 text-slate-500 hover:text-blue-600 border border-slate-200"
              )}
            >
              <Scale className="w-3 h-3" />
              <span className="hidden md:inline">{isSelected ? "Terpilih" : "Bandingkan"}</span>
            </div>
          )}

          {/* Logo Brand (Floating di bawah kiri gambar) */}
          {brandLogoUrl && (
             <div className="absolute bottom-3 left-3 z-10 w-8 h-8 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center p-1">
                <Image src={brandLogoUrl} alt="brand" width={32} height={32} className="object-contain" unoptimized />
             </div>
          )}

          {/* Gambar Produk */}
          {imageUrl ? (
            <div className="relative w-full h-full group-hover:scale-105 transition-transform duration-500">
              <Image src={imageUrl} alt={product.nama_produk} fill className="object-contain" sizes="(max-width: 768px) 100vw, 33vw" unoptimized />
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded-full">
              <Smartphone className="w-10 h-10 text-slate-300" />
            </div>
          )}
        </div>

        {/* --- ISI KONTEN --- */}
        <CardContent className="p-4 grow flex flex-col">
          
          {/* Nama Produk */}
          <h3 className="font-bold text-slate-800 text-sm md:text-base line-clamp-2 leading-snug min-h-[2.5em] mb-1 group-hover:text-blue-600 transition-colors">
            {product.nama_produk}
          </h3>

          {/* Spesifikasi Singkat (Chipset/RAM) - Opsional biar padat */}
          <p className="text-[10px] text-slate-400 mb-3 truncate">
            {product.tahun_rilis} • {product.spesifikasi?.chipset || "Spesifikasi belum lengkap"}
          </p>

          <div className="mt-auto">
            {/* HARGA UTAMA (Real E-commerce) */}
            <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    {hasEcommerce ? "Harga Terbaik" : "Estimasi Harga"}
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                        {displayPrice ? formatRupiah(displayPrice) : "Cek Stok"}
                    </span>
                </div>
                
                {/* LABEL SUMBER HARGA */}
                <div className="flex items-center gap-1.5 mt-1">
                    {hasEcommerce ? (
                        <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] bg-green-50 text-green-700 border-green-200 font-bold rounded-md">
                           <ShoppingBag className="w-3 h-3 mr-1" /> {displayLabel}
                        </Badge>
                    ) : (
                        <span className="text-[10px] text-slate-400 font-medium">Data pasar manual</span>
                    )}
                </div>

                {hasEcommerce ? (
                  <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-slate-500">
                    {priceFreshness === "stale" ? (
                      <>
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        Harga perlu cek ulang
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 text-emerald-600" />
                        Harga relatif fresh
                      </>
                    )}
                  </div>
                ) : null}
            </div>
          </div>
        </CardContent>

        {/* Footer (Action) */}
        <CardFooter className="p-4 pt-0">
           <div className={cn(
             buttonVariants({ variant: "ghost", size: "sm" }), 
             "w-full text-xs font-bold text-slate-500 bg-slate-50 group-hover:bg-slate-900 group-hover:text-white transition-all border border-slate-200 justify-between px-4 rounded-lg"
           )}>
             <span>Lihat Detail</span>
             <ArrowUpRight className="w-3 h-3 opacity-50 group-hover:opacity-100" />
           </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
