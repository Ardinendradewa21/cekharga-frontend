import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Produk, ApiResponse, MarketplaceLink } from "@/types";
import { ArrowLeft, Camera, Cpu, Smartphone, Check, X, Share2, Scale, Monitor, ShoppingBag, ExternalLink, RefreshCw, PlayCircle, MessageSquareQuote } from "lucide-react"; 
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

// --- 0. DEFINISI TIPE LOKAL ---
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

const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins}m lalu`;
    if (diffMins < 1440) return `${Math.floor(diffMins/60)}j lalu`;
    return date.toLocaleDateString("id-ID", { day: 'numeric', month: 'short' });
};

// Helper Render Tag Varian
const renderVarian = (data: unknown) => {
  if (!data) return <span className="text-slate-400">-</span>;
  let items: string[] = [];
  
  if (Array.isArray(data)) {
    items = data;
  } else if (typeof data === 'string') {
    try {
      if (data.trim().startsWith('[')) items = JSON.parse(data);
      else items = data.split(',').map(s => s.trim());
    } catch (e) { items = [data]; }
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

// Helper Gambar
const getImageUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  try {
    const baseUrl = new URL(apiUrl).origin;
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${baseUrl}/storage/${cleanPath}`;
  } catch (e) { return null; }
};

// 🔥 HELPER PARSE VIDEO URL (YOUTUBE & TIKTOK)
const getVideoEmbed = (url: string, platform: string) => {
    if (!url) return null;

    // 1. Logic YouTube (Regex Canggih)
    if (platform === 'youtube') {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            return `https://www.youtube.com/embed/${match[2]}`;
        }
    }

    // 2. Logic TikTok (Ambil ID Video)
    if (platform === 'tiktok') {
        const match = url.match(/\/video\/(\d+)/);
        if (match && match[1]) {
            return `https://www.tiktok.com/embed/v2/${match[1]}`;
        }
    }

    return null;
};

const getMarketplaceConfigFallback = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('shopee')) return { classColor: "bg-[#EE4D2D]", logo: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg", label: "Shopee" };
  if (n.includes('tokopedia')) return { classColor: "bg-[#03AC0E]", logo: "https://assets.tokopedia.net/assets-tokopedia-lite/v2/zeus/kratos/6055eb99.png", label: "Tokopedia" };
  if (n.includes('blibli')) return { classColor: "bg-[#0095DA]", logo: "https://upload.wikimedia.org/wikipedia/commons/0/07/Blibli_logo.svg", label: "Blibli" };
  if (n.includes('lazada')) return { classColor: "bg-[#0f146d]", logo: "https://upload.wikimedia.org/wikipedia/commons/4/4d/Lazada_Logo.svg", label: "Lazada" };
  return { classColor: "bg-slate-900", logo: null, label: name };
};

// --- KOMPONEN UTAMA ---
export default async function ProductDetailPage(props: Props) {
  const params = await props.params;
  const slug = params.slug;

  if (!slug) return notFound();
  const product = await getProductDetail(slug);
  if (!product) return notFound();
  
  const sortedLinks = product.marketplace_links?.sort((a, b) => a.harga - b.harga) || [];
  const lowestPriceLink = sortedLinks.length > 0 ? sortedLinks[0] : null;

  return (
    <main className="min-h-screen bg-[#F8F9FA] pb-20 selection:bg-blue-100 font-sans">
      
      {/* HEADER STICKY */}
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
        
        {/* KOLOM KIRI (FOTO & HARGA) */}
        <div className="lg:col-span-1 space-y-6 h-fit lg:sticky lg:top-24">
          
          {/* Foto Produk */}
          <div className="aspect-[4/5] lg:aspect-square bg-white rounded-3xl flex items-center justify-center relative overflow-hidden border border-slate-200 shadow-sm p-8 group">
            {getImageUrl(product.foto) ? (
              <div className="relative w-full h-full transition-transform duration-500 group-hover:scale-105">
                <Image src={getImageUrl(product.foto)!} alt={product.nama_produk} fill className="object-contain" priority sizes="(max-width: 768px) 100vw, 33vw" unoptimized={true} />
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

          {/* CARD MARKETPLACE */}
          <Card className="border-0 shadow-xl shadow-blue-900/5 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                     <ShoppingBag className="w-5 h-5 text-blue-600 fill-blue-100" />
                     <h3 className="font-bold text-slate-900 text-lg">Pilihan Toko</h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                     <RefreshCw className="w-3 h-3" />
                     Sync: {formatTimeAgo(product.updated_at)}
                  </div>
              </div>
              
              <div className="space-y-3">
                {sortedLinks.length > 0 ? (
                    sortedLinks.map((linkData) => {
                      const link = linkData as ExtendedMarketplaceLink;
                      const mpFromDB = link.marketplace;
                      const fallbackConfig = getMarketplaceConfigFallback(link.nama_marketplace);
                      const mpName = mpFromDB?.nama || link.nama_marketplace || fallbackConfig.label;
                      const mpLogo = mpFromDB?.logo ? getImageUrl(mpFromDB.logo) : fallbackConfig.logo;
                      const hasDbColor = !!mpFromDB?.warna_hex;
                      const finalStyle = hasDbColor ? { backgroundColor: mpFromDB?.warna_hex } : {};
                      const finalClass = hasDbColor ? "" : fallbackConfig.classColor;
                      const textColor = mpFromDB?.text_color || "#ffffff";

                      return (
                        <a key={link.id} href={link.url_produk} target="_blank" rel="noreferrer" className="group block">
                          <div className={`relative overflow-hidden flex items-center justify-between p-3.5 rounded-xl border border-transparent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${finalClass}`} style={finalStyle}>
                             <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                             <div className="flex items-center gap-3 z-10 w-full relative">
                                <div className="bg-white p-1.5 rounded-lg shrink-0 w-10 h-10 flex items-center justify-center shadow-sm overflow-hidden">
                                   {mpLogo ? <Image src={mpLogo} alt={mpName} width={40} height={40} className="object-contain w-full h-full" unoptimized /> : <ExternalLink className="w-5 h-5 text-slate-400" />}
                                </div>
                                <div className="flex flex-col flex-1 min-w-0" style={{ color: textColor }}>
                                   <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-lg font-black tracking-tight whitespace-nowrap">{formatRupiah(link.harga)}</span>
                                      {link.id === lowestPriceLink?.id && <span className="bg-white/90 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">Termurah</span>}
                                   </div>
                                   <span className="text-[11px] font-medium opacity-90 truncate w-full block flex items-center gap-1">{link.nama_toko || mpName} • {link.kondisi}</span>
                                </div>
                                <div className="bg-white text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm whitespace-nowrap group-hover:scale-105 transition-transform shrink-0">Beli</div>
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
              <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Estimasi Bekas</span>
                      <span className="font-bold text-slate-700">{product.harga_terendah_bekas ? formatRupiah(product.harga_terendah_bekas) : "-"}</span>
                  </div>
              </div>
            </div>
          </Card>
        </div>

        {/* KOLOM KANAN (CONTENT) */}
        <div className="lg:col-span-2 space-y-8 lg:mt-2 min-w-0"> {/* Min-w-0 penting biar flex child ga overflow */}
          
          <div className="lg:hidden mb-4">
             <h1 className="text-2xl font-black text-slate-900 leading-tight mb-2">{product.nama_produk}</h1>
          </div>

          {/* 🔥 SECTION REVIEWER CORNER (HORIZONTAL SCROLL) 🔥 */}
          {product.reviews && product.reviews.length > 0 ? (
            <section className="overflow-hidden"> {/* Wrapper agar tidak overflow layout utama */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="bg-red-600 text-white p-2 rounded-lg shrink-0">
                        <PlayCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 leading-none">Kata Reviewer</h2>
                        <p className="text-xs text-slate-500 mt-1">Apa kata para ahli tentang HP ini?</p>
                    </div>
                </div>

                {/* CONTAINER HORIZONTAL SCROLL */}
                <div className="flex overflow-x-auto pb-6 gap-4 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                    {product.reviews.map((review) => {
                        const embedUrl = getVideoEmbed(review.video_url, review.platform);
                        const isTikTok = review.platform === 'tiktok';

                        return (
                            <div 
                                key={review.id} 
                                // LOGIC SIZE CARD ADAPTIF
                                // TikTok: Lebar 280px (Ramping)
                                // YouTube: Lebar 320px - 450px (Lebar)
                                className={`
                                    bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col flex-none snap-center
                                    ${isTikTok ? 'w-70' : 'w-[300px] md:w-[450px]'}
                                `}
                            >
                                {/* Video Player Container */}
                                <div className={`w-full relative bg-black ${isTikTok ? 'aspect-[9/16]' : 'aspect-video'}`}>
                                    {embedUrl ? (
                                        <iframe 
                                            src={embedUrl} 
                                            title={review.reviewer_name}
                                            className="w-full h-full absolute inset-0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                            allowFullScreen
                                            sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-4 text-center">
                                            <PlayCircle className="w-10 h-10 opacity-50 mb-2" />
                                            <p className="text-xs font-medium">Tonton di {review.platform}</p>
                                            <a href={review.video_url} target="_blank" className="mt-3 px-4 py-2 bg-white text-black rounded-full text-[10px] font-bold hover:bg-slate-200 transition">
                                                Buka Link
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Quote & Info */}
                                <div className="p-4 flex flex-col grow">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="text-[10px] font-bold text-slate-700 border-slate-300">
                                            {review.reviewer_name}
                                        </Badge>
                                        <span className="text-[9px] text-slate-400 uppercase tracking-wider font-medium">{review.platform}</span>
                                    </div>
                                    
                                    {review.highlight_quote && (
                                        <div className="relative pl-5 mt-1">
                                            <MessageSquareQuote className="w-6 h-6 text-slate-100 absolute -top-1 -left-1 -z-0" />
                                            <p className="text-xs text-slate-600 italic leading-relaxed relative z-10 font-medium line-clamp-3">
                                                {review.highlight_quote}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
          ) : (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-center gap-4">
                 <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                    <PlayCircle className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-800 text-sm">Belum ada review video</h3>
                    <p className="text-slate-500 text-xs">Jadilah yang pertama mereview produk ini.</p>
                 </div>
            </div>
          )}

          {/* SPESIFIKASI LENGKAP */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-slate-700" /> Spesifikasi Teknis
            </h2>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm text-sm">
              {/* ... Bagian Spesifikasi Tetap Sama ... */}
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

const SpecRow = ({ label, value }: { label: string, value: unknown }) => (
   <div className="grid grid-cols-3 px-6 py-4 hover:bg-slate-50/50 transition-colors">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className="col-span-2 text-sm text-slate-900 font-medium break-words">
          {cleanString(value)}
      </span>
   </div>
);