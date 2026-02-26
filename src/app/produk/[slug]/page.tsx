import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Produk, ProductVariant } from "@/types";
import { ArrowLeft, Camera, Cpu, Smartphone, Check, X, Share2, Scale, Monitor, ShoppingBag, RefreshCw, PlayCircle, MessageSquareQuote } from "lucide-react"; 
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/server/repositories/product-repository";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";
import { VariantPriceSwitcher } from "./VariantPriceSwitcher";

// --- 1. FUNGSI AMBIL DATA ---
async function getProductDetail(slug: string) {
  try {
    return (await getProductBySlug(slug)) as Produk | null;
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const product = await getProductDetail(params.slug);

  if (!product) {
    return {
      title: "Produk tidak ditemukan",
      robots: { index: false, follow: false },
    };
  }

  const description = [
    `${product.nama_produk} (${product.tahun_rilis || "-"})`,
    product.spesifikasi?.chipset ? `Chipset ${product.spesifikasi.chipset}` : "",
    product.harga_terendah_baru ? `Harga mulai ${formatRupiah(product.harga_terendah_baru)}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  const canonicalUrl = absoluteUrl(`/produk/${product.slug}`);
  const imagePath = getImageUrl(product.foto);
  const imageUrl = imagePath ? (imagePath.startsWith("http") ? imagePath : absoluteUrl(imagePath)) : absoluteUrl("/next.svg");

  return {
    title: `${product.nama_produk} - Harga & Spesifikasi`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${product.nama_produk} - Harga & Spesifikasi`,
      description,
      url: canonicalUrl,
      type: "article",
      siteName: SITE_NAME,
      images: [
        {
          url: imageUrl,
          alt: product.nama_produk,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.nama_produk} - Harga & Spesifikasi`,
      description,
      images: [imageUrl],
    },
  };
}

// --- HELPERS ---
// Format angka ke mata uang Rupiah untuk harga produk.
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
    } catch { items = [data]; }
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
// Mendukung URL penuh, path local /uploads, atau path storage backend API.
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

// 🔥 HELPER PARSE VIDEO URL (YOUTUBE & TIKTOK)
const getVideoEmbed = (url: string, platform: string) => {
    // Fungsi ini mengubah URL video mentah ke format embed iframe.
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

// --- KOMPONEN UTAMA ---
export default async function ProductDetailPage(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const slug = params.slug;
  const rawVariantParam = searchParams.variant;
  const variantParam = Array.isArray(rawVariantParam) ? rawVariantParam[0] : rawVariantParam;
  const parsedVariantId = variantParam ? Number(variantParam) : null;
  const initialVariantId =
    parsedVariantId !== null && Number.isFinite(parsedVariantId) && parsedVariantId > 0 ? parsedVariantId : null;

  if (!slug) return notFound();
  const product = await getProductDetail(slug);
  if (!product) return notFound();
  
  const variants = (product.variants ?? []) as ProductVariant[];
  const sortedLinks = [...(product.marketplace_links || [])].sort((a, b) => a.harga - b.harga);
  const priceSyncAt = product.price_last_updated_at || product.updated_at;
  const isPriceStale = product.price_data_status === "stale";
  const imagePath = getImageUrl(product.foto);
  // Structured data supaya search engine lebih mudah memahami detail produk.
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nama_produk,
    image: imagePath ? (imagePath.startsWith("http") ? imagePath : absoluteUrl(imagePath)) : undefined,
    brand: {
      "@type": "Brand",
      name: (product.brand as { nama_brand?: string } | null)?.nama_brand ?? "Unknown",
    },
    sku: product.slug,
    releaseDate: product.spesifikasi?.tanggal_rilis ?? undefined,
    description: `${product.nama_produk} dengan chipset ${product.spesifikasi?.chipset ?? "-"}`,
    offers: sortedLinks
      .filter((link) => link.status_aktif)
      .slice(0, 5)
      .map((link) => ({
        "@type": "Offer",
        priceCurrency: "IDR",
        price: link.harga,
        url: link.url_produk,
        availability: "https://schema.org/InStock",
        seller: {
          "@type": "Organization",
          name: link.nama_marketplace,
        },
      })),
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] pb-20 selection:bg-blue-100 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      
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
                     Sync: {formatTimeAgo(priceSyncAt || undefined)}
                  </div>
              </div>

              {isPriceStale ? (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Data harga terakhir cukup lama. Disarankan cek ulang marketplace sebelum transaksi.
                </div>
              ) : null}
              
              <VariantPriceSwitcher
                variants={variants.map((variant) => ({
                  id: variant.id,
                  label: variant.label,
                  is_default: variant.is_default,
                  prices: variant.prices,
                }))}
                fallbackLinks={sortedLinks}
                initialVariantId={initialVariantId}
              />

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

