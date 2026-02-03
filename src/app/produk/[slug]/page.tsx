import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Produk, ApiResponse, MarketplaceLink } from "@/types";
import { ArrowLeft, Battery, Camera, Cpu, Zap, Smartphone, Check, X, ShieldCheck, Share2, Scale, Volume2, Wifi, Usb, Monitor, ShoppingBag, ExternalLink, Store, Info } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

// --- 0. DEFINISI TIPE LOKAL (Agar tidak error 'any') ---
// Kita extend tipe MarketplaceLink biar TS tau ada relasi 'marketplace'
interface ExtendedMarketplaceLink extends MarketplaceLink {
  marketplace?: {
    nama?: string;
    logo?: string;
    warna_hex?: string;
    text_color?: string;
  };
}

// --- 1. FUNGSI AMBIL DATA ---
async function getProductDetail(slug: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  try {
    const res = await fetch(`${apiUrl}/products/${slug}`, { 
      cache: "no-store",
      next: { revalidate: 0 } 
    });

    if (!res.ok) return null;
    const result: ApiResponse<Produk> = await res.json();
    return result.data;

  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

type Props = {
  params: Promise<{ slug: string }>;
};

// --- HELPERS ---
const formatRupiah = (num?: number): string => {
  if (!num) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
};

const cleanString = (val: unknown): string => {
  return String(val || "-").replace(/[\[\]"]/g, '');
};

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
    } catch (e) {
      items = [data]; 
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, idx) => (
        <Badge key={idx} variant="secondary" className="text-[10px] sm:text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
          {item.replace(/[\[\]"]/g, '')}
        </Badge>
      ))}
    </div>
  );
};

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

// --- HELPER CONFIG FALLBACK (Jika DB kosong) ---
const getMarketplaceConfigFallback = (name: string) => {
  const n = name.toLowerCase();
  
  if (n.includes('shopee')) return { 
    classColor: "bg-[#EE4D2D]", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg",
    label: "Shopee"
  };
  if (n.includes('tokopedia')) return { 
    classColor: "bg-[#03AC0E]", 
    logo: "https://assets.tokopedia.net/assets-tokopedia-lite/v2/zeus/kratos/6055eb99.png", 
    label: "Tokopedia"
  };
  if (n.includes('blibli')) return { 
    classColor: "bg-[#0095DA]", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/07/Blibli_logo.svg",
    label: "Blibli"
  };
  if (n.includes('lazada')) return { 
    classColor: "bg-[#0f146d]", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/4d/Lazada_Logo.svg",
    label: "Lazada"
  };
  
  return { 
    classColor: "bg-slate-900", 
    logo: null,
    label: name
  };
};

// --- 2. KOMPONEN UTAMA ---
export default async function ProductDetailPage(props: Props) {
  const params = await props.params;
  const slug = params.slug;

  if (!slug) return notFound();
  const product = await getProductDetail(slug);
  if (!product) return notFound();

  // Hitung persentase bar AnTuTu
  const performancePercent = product.spesifikasi?.skor_antutu 
    ? Math.min((product.spesifikasi.skor_antutu / 2000000) * 100, 100) 
    : 0;
  
  // Sortir Data Marketplace (Termurah di atas)
  const sortedLinks = product.marketplace_links?.sort((a, b) => a.harga - b.harga) || [];
  const lowestPriceLink = sortedLinks.length > 0 ? sortedLinks[0] : null;

  return (
    <main className="min-h-screen bg-[#F8F9FA] pb-20 selection:bg-blue-100 font-sans">
      
      {/* --- HEADER STICKY --- */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 transition-all shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 -ml-2">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Button>
            </Link>
            <h1 className="font-bold text-slate-800 text-lg truncate max-w-[200px] md:max-w-md hidden md:block">
              {product.nama_produk}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="hidden md:flex gap-2 rounded-full border-slate-200 text-slate-600">
              <Share2 className="w-4 h-4" /> Share
            </Button>
            <Link href={`/bandingkan?hp1=${product.slug}`}>
              <Button size="sm" className="rounded-full bg-blue-600 hover:bg-blue-700 text-white gap-2 px-5">
                <Scale className="w-4 h-4" /> Bandingkan
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- KOLOM KIRI (GAMBAR & CARD HARGA UTAMA) --- */}
        <div className="lg:col-span-1 space-y-6 h-fit lg:sticky lg:top-24">
          
          {/* Foto Produk */}
          <div className="aspect-[4/5] lg:aspect-square bg-white rounded-3xl flex items-center justify-center relative overflow-hidden border border-slate-200 shadow-sm p-8 group">
            {getImageUrl(product.foto) ? (
              <div className="relative w-full h-full transition-transform duration-500 group-hover:scale-105">
                <Image 
                  src={getImageUrl(product.foto)!} 
                  alt={product.nama_produk}
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 768px) 100vw, 33vw"
                  unoptimized={true} 
                />
              </div>
            ) : (
              <div className="bg-slate-50 p-8 rounded-full">
                <Smartphone strokeWidth={1} className="w-24 h-24 text-slate-300" />
              </div>
            )}
            
            <div className="absolute top-4 left-4">
              <Badge variant="secondary" className="bg-white/90 backdrop-blur text-slate-600 border border-slate-200 shadow-sm">
                Rilis {product.tahun_rilis}
              </Badge>
            </div>
          </div>

          {/* --- CARD MARKETPLACE (SPOTLIGHT UTAMA) --- */}
          <Card className="border-0 shadow-xl shadow-blue-900/5 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                 <ShoppingBag className="w-5 h-5 text-blue-600 fill-blue-100" />
                 <h3 className="font-bold text-slate-900 text-lg">Pilihan Toko Terbaik</h3>
              </div>
              
              {/* LIST TOKO (Looping Data Database) */}
              <div className="space-y-3">
                {sortedLinks.length > 0 ? (
                    sortedLinks.map((linkData) => {
                      // Casting ke tipe lokal agar tidak error 'any'
                      const link = linkData as ExtendedMarketplaceLink;
                      const mpFromDB = link.marketplace;
                      const fallbackConfig = getMarketplaceConfigFallback(link.nama_marketplace);

                      // 1. Tentukan Nama & Logo
                      const mpName = mpFromDB?.nama || link.nama_marketplace || fallbackConfig.label;
                      const mpLogo = mpFromDB?.logo ? getImageUrl(mpFromDB.logo) : fallbackConfig.logo;
                      
                      // 2. Tentukan Warna Background (DB Prioritas -> Fallback Tailwind)
                      const hasDbColor = !!mpFromDB?.warna_hex;
                      const finalStyle = hasDbColor ? { backgroundColor: mpFromDB?.warna_hex } : {};
                      const finalClass = hasDbColor ? "" : fallbackConfig.classColor; // Pakai class fallback jika DB kosong

                      // 3. Tentukan Warna Teks
                      const textColor = mpFromDB?.text_color || "#ffffff";

                      return (
                        <a 
                          key={link.id} 
                          href={link.url_produk} 
                          target="_blank" 
                          rel="noreferrer"
                          className="group block"
                        >
                          {/* Container Card Toko */}
                          <div 
                            className={`relative overflow-hidden flex items-center justify-between p-3.5 rounded-xl border border-transparent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${finalClass}`}
                            style={finalStyle}
                          >
                             {/* Decorative Glow */}
                             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>

                             {/* Content Wrapper */}
                             <div className="flex items-center gap-3 z-10 w-full relative">
                                
                                {/* LOGO MARKETPLACE (BG Putih agar logo jelas) */}
                                <div className="bg-white p-1.5 rounded-lg shrink-0 w-10 h-10 flex items-center justify-center shadow-sm overflow-hidden">
                                   {mpLogo ? (
                                      <Image 
                                        src={mpLogo} 
                                        alt={mpName} 
                                        width={40} 
                                        height={40} 
                                        className="object-contain w-full h-full"
                                        unoptimized
                                      />
                                   ) : (
                                      <ExternalLink className="w-5 h-5 text-slate-400" />
                                   )}
                                </div>

                                {/* Info Harga & Toko */}
                                <div className="flex flex-col flex-1 min-w-0" style={{ color: textColor }}>
                                   <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-lg font-black tracking-tight whitespace-nowrap">
                                         {formatRupiah(link.harga)}
                                      </span>
                                      {/* Badge Termurah */}
                                      {link.id === lowestPriceLink?.id && (
                                         <span className="bg-white/90 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                                            Termurah
                                         </span>
                                      )}
                                   </div>
                                   <span className="text-[11px] font-medium opacity-90 truncate w-full block flex items-center gap-1">
                                      {link.nama_toko || mpName} • {link.kondisi}
                                   </span>
                                </div>

                                {/* Button Action */}
                                <div className="bg-white text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm whitespace-nowrap group-hover:scale-105 transition-transform shrink-0">
                                   Beli
                                </div>
                             </div>
                          </div>
                        </a>
                      );
                    })
                ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-slate-500 text-sm">Belum ada link toko tersedia.</p>
                    </div>
                )}
              </div>

              <Separator className="my-5 bg-slate-100" />

              {/* ESTIMASI BEKAS (SECONDARY / DIBAWAH) */}
              <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Estimasi Bekas</span>
                      <span className="font-bold text-slate-700">
                        {product.harga_terendah_bekas ? formatRupiah(product.harga_terendah_bekas) : "-"}
                      </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Harga Baru Official</span>
                      <span className="font-bold text-slate-700">
                        {product.harga_terendah_baru ? formatRupiah(product.harga_terendah_baru) : "-"}
                      </span>
                  </div>
                  <div className="flex items-start gap-2 mt-2 bg-blue-50 p-2 rounded text-[10px] text-blue-700 leading-tight border border-blue-100">
                     <Info className="w-3 h-3 mt-0.5 shrink-0" />
                     Harga estimasi pasar bisa berubah sewaktu-waktu tergantung kondisi dan lokasi.
                  </div>
              </div>

            </div>
          </Card>
        </div>

        {/* --- KOLOM KANAN (SPESIFIKASI) --- */}
        <div className="lg:col-span-2 space-y-8 lg:mt-2">
          
          <div className="lg:hidden mb-4">
             <h1 className="text-2xl font-black text-slate-900 leading-tight mb-2">{product.nama_produk}</h1>
          </div>

          {/* PERFORMA */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              Performa & Baterai
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Skor AnTuTu</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tight">
                      {product.spesifikasi?.skor_antutu?.toLocaleString() || "N/A"}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                    v10 Benchmark
                  </Badge>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden relative z-10">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full" style={{ width: `${performancePercent}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-3">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Kamera</span>
                  <span className="text-xl font-black text-slate-800 mt-1">
                    {product.spesifikasi?.bintang_kamera || "-"}<span className="text-xs text-slate-300 font-medium">/10</span>
                  </span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-3">
                    <Battery className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Baterai</span>
                  <span className="text-xl font-black text-slate-800 mt-1">
                    {product.spesifikasi?.bintang_baterai || "-"}<span className="text-xs text-slate-300 font-medium">/10</span>
                  </span>
                </div>
              </div>
            </div>
            {product.spesifikasi?.kesimpulan_singkat && (
              <div className="mt-4 bg-white border border-blue-100 p-5 rounded-2xl shadow-sm">
                 <div className="flex gap-4">
                    <div className="text-2xl">🤖</div>
                    <div>
                       <h3 className="font-bold text-slate-800 text-sm mb-1">Review Singkat AI</h3>
                       <p className="text-slate-600 text-sm leading-relaxed">{product.spesifikasi.kesimpulan_singkat}</p>
                    </div>
                 </div>
              </div>
            )}
          </section>

          {/* SPESIFIKASI */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Spesifikasi Lengkap</h2>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm text-sm">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest">Body & Desain</div>
              <div className="divide-y divide-slate-50">
                <SpecRow label="Dimensi" value={product.spesifikasi?.dimensi} />
                <SpecRow label="Berat" value={product.spesifikasi?.berat} />
                <SpecRow label="Ketahanan" value={product.spesifikasi?.rating_ip} />
              </div>
              <div className="bg-slate-50 px-6 py-3 border-y border-slate-100 flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest"><Monitor className="w-4 h-4"/> Layar</div>
              <div className="divide-y divide-slate-50">
                <SpecRow label="Tipe Panel" value={product.spesifikasi?.tipe_layar} />
                <SpecRow label="Ukuran" value={product.spesifikasi?.ukuran_layar ? `${product.spesifikasi.ukuran_layar} Inci` : "-"} />
                <SpecRow label="Resolusi" value={product.spesifikasi?.resolusi} />
              </div>
              <div className="bg-slate-50 px-6 py-3 border-y border-slate-100 flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest"><Cpu className="w-4 h-4"/> Hardware</div>
              <div className="divide-y divide-slate-50">
                <div className="grid grid-cols-3 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <span className="text-sm font-medium text-slate-500">Chipset</span>
                  <span className="col-span-2 text-sm font-bold text-blue-900">{cleanString(product.spesifikasi?.chipset)}</span>
                </div>
                <div className="grid grid-cols-3 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <span className="text-sm font-medium text-slate-500">RAM/ROM</span>
                  <div className="col-span-2">{renderVarian(product.spesifikasi?.varian_internal)}</div>
                </div>
                <div className="grid grid-cols-3 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <span className="text-sm font-medium text-slate-500">Slot MicroSD</span>
                  <span className="col-span-2 text-sm text-slate-900 font-medium flex items-center gap-2">
                    {product.spesifikasi?.ada_slot_memori ? <><Check className="w-4 h-4 text-green-600" /> Ada</> : <><X className="w-4 h-4 text-slate-400" /> Tidak Ada</>}
                  </span>
                </div>
              </div>
              <div className="bg-slate-50 px-6 py-3 border-y border-slate-100 flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest"><Camera className="w-4 h-4"/> Kamera</div>
              <div className="divide-y divide-slate-50">
                 <SpecRow label="Kamera Utama" value={product.spesifikasi?.kamera_utama_mp ? `${product.spesifikasi.kamera_utama_mp} MP` : "-"} />
                 <SpecRow label="Fitur" value={product.spesifikasi?.detail_kamera_utama} />
                 <SpecRow label="Video Belakang" value={product.spesifikasi?.kamera_utama_video} />
                 <SpecRow label="Kamera Selfie" value={product.spesifikasi?.kamera_selfie_mp ? `${product.spesifikasi.kamera_selfie_mp} MP` : "-"} />
              </div>
              <div className="bg-slate-50 px-6 py-3 border-y border-slate-100 flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest">Fitur & Lainnya</div>
              <div className="divide-y divide-slate-50">
                <div className="grid grid-cols-3 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <span className="text-sm font-medium text-slate-500">NFC</span>
                  <span className="col-span-2 text-sm text-slate-900 font-medium flex items-center gap-2">
                    {product.spesifikasi?.ada_nfc ? <><Check className="w-4 h-4 text-green-600" /> Support</> : <><X className="w-4 h-4 text-slate-400" /> Tidak Support</>}
                  </span>
                </div>
                <div className="grid grid-cols-3 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <span className="text-sm font-medium text-slate-500">Baterai</span>
                  <span className="col-span-2 text-sm text-slate-900 font-medium">
                    {product.spesifikasi?.kapasitas_baterai ? `${product.spesifikasi.kapasitas_baterai} mAh` : "-"}
                    <span className="block text-xs text-slate-400 mt-1">{cleanString(product.spesifikasi?.kecepatan_cas)}</span>
                  </span>
                </div>
                <SpecRow label="Speaker" value={product.spesifikasi?.sound_loudspeaker} />
                <div className="grid grid-cols-3 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                   <span className="text-sm font-medium text-slate-500">3.5mm Jack</span>
                   <span className="col-span-2 text-sm text-slate-900 font-medium flex items-center gap-2">
                     {product.spesifikasi?.sound_jack ? <><Check className="w-4 h-4 text-green-600" /> Ada</> : <><X className="w-4 h-4 text-slate-400" /> Tidak Ada</>}
                   </span>
                </div>
                <SpecRow label="WLAN" value={product.spesifikasi?.comms_wlan} />
                <SpecRow label="Bluetooth" value={product.spesifikasi?.comms_bluetooth} />
                <SpecRow label="USB" value={product.spesifikasi?.comms_usb} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

// Komponen Kecil untuk Baris Tabel 
const SpecRow = ({ label, value }: { label: string, value: unknown }) => (
   <div className="grid grid-cols-3 px-6 py-4 hover:bg-slate-50/50 transition-colors">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className="col-span-2 text-sm text-slate-900 font-medium break-words">
         {cleanString(value)}
      </span>
   </div>
);