import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Produk, ProductVariant } from "@/types";
import { ArrowLeft, Camera, Cpu, Smartphone, Check, X, Share2, Scale, Monitor, ShoppingBag, RefreshCw, PlayCircle, MessageSquareQuote, type LucideIcon } from "lucide-react"; 
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { formatPublicVariantLabel, formatVariantLabelFromNumbers } from "@/lib/variant-label";
import { formatRupiah } from "@/lib/format";
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

const buildVariantLabels = (variants: ProductVariant[]): string[] => {
  // Detail spesifikasi sebaiknya membaca source of truth terbaru dari tabel variant.
  // Fallback ke field spesifikasi lama hanya dipakai kalau relasi variant memang belum tersedia.
  return variants
    .filter((variant) => variant.status_aktif !== false)
    .map((variant) => {
      const normalized = formatPublicVariantLabel(variant.label, {
        isDefault: variant.is_default,
        fallbackId: variant.id,
      });
      if (normalized) return normalized;

      if (variant.ram_gb > 0 && variant.storage_gb > 0) {
        return formatVariantLabelFromNumbers(variant.ram_gb, variant.storage_gb);
      }

      return null;
    })
    .filter((label): label is string => Boolean(label));
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
  const displayedVariantLabels = buildVariantLabels(variants);
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

      <div className="container mx-auto grid grid-cols-1 gap-5 px-4 py-5 sm:gap-6 sm:py-8 lg:grid-cols-3 xl:gap-8">
        
        {/* KOLOM KIRI (FOTO & HARGA) */}
        <div className="h-fit space-y-4 sm:space-y-5 lg:col-span-1 lg:sticky lg:top-24">
          
          {/* Foto Produk */}
          <div className="group relative aspect-[4/4.5] overflow-hidden rounded-[24px] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/70 p-6 shadow-lg shadow-slate-900/5 sm:aspect-[4/5] sm:rounded-[28px] sm:p-8 lg:aspect-square">
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
          <Card className="overflow-hidden rounded-[24px] border-0 bg-white shadow-xl shadow-blue-900/5 ring-1 ring-slate-100 sm:rounded-[28px]">
            <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-start gap-2.5">
                       <div className="rounded-xl border border-blue-100 bg-blue-50 p-2 text-blue-600">
                         <ShoppingBag className="w-4 h-4" />
                       </div>
                       <div>
                         <h3 className="font-bold text-slate-900 text-lg">Pilihan Toko</h3>
                         <p className="max-w-sm text-sm leading-relaxed text-slate-500">
                           Pilih penawaran terbaik berdasarkan varian yang sedang aktif.
                         </p>
                       </div>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-700">
                     <RefreshCw className="w-3 h-3" />
                     Sync: {formatTimeAgo(priceSyncAt || undefined)}
                  </div>
              </div>

              {isPriceStale ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                  Data harga terakhir cukup lama. Disarankan cek ulang marketplace sebelum transaksi.
                </div>
              ) : null}
              
              <VariantPriceSwitcher
                variants={variants.map((variant) => ({
                  id: variant.id,
                  label: variant.label,
                  is_default: variant.is_default,
                  status_aktif: variant.status_aktif,
                  prices: variant.prices,
                }))}
                fallbackLinks={sortedLinks}
                initialVariantId={initialVariantId}
              />

              <div className="border-t border-slate-100 pt-4 sm:pt-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                {/* Estimasi bekas dipisah jadi panel kecil sendiri agar ritme visual kolom kiri
                    lebih seimbang setelah blok penawaran utama. */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Estimasi Bekas</p>
                      <p className="mt-1 text-sm text-slate-500">Referensi pasar second-hand bila tersedia.</p>
                    </div>
                    <span className="text-lg font-black tracking-tight text-slate-900">
                      {product.harga_terendah_bekas ? formatRupiah(product.harga_terendah_bekas) : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* KOLOM KANAN (CONTENT) */}
        <div className="min-w-0 space-y-6 lg:col-span-2 lg:mt-2 lg:space-y-8"> {/* Min-w-0 penting biar flex child ga overflow */}
          
          <div className="mb-3 lg:hidden">
             <h1 className="text-2xl font-black text-slate-900 leading-tight mb-2">{product.nama_produk}</h1>
          </div>

          {/* Reviewer dibuat horizontal scroll supaya mobile tetap fokus ke highlight.
              Tujuannya agar user tidak dipaksa membaca card panjang satu per satu. */}
          {product.reviews && product.reviews.length > 0 ? (
            <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5"> {/* Wrapper agar tidak overflow layout utama */}
                <div className="mb-4 flex items-start gap-3 sm:mb-5 sm:items-center">
                    <div className="shrink-0 rounded-2xl border border-rose-100 bg-rose-50 p-2.5 text-rose-600">
                        <PlayCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold leading-none text-slate-900 sm:text-xl">Kata Reviewer</h2>
                        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">`r`n                          Ringkasan opini reviewer agar user lebih cepat menangkap nilai produknya.`r`n                        </p>
                    </div>
                </div>

                {/* CONTAINER HORIZONTAL SCROLL */}
                <div className="no-scrollbar -mx-2 flex snap-x gap-3 overflow-x-auto px-2 pb-2 md:mx-0 md:gap-4 md:px-0">
                    {product.reviews.map((review) => {
                        const embedUrl = getVideoEmbed(review.video_url, review.platform);
                        const isTikTok = review.platform === 'tiktok';

                        return (
                            <div 
                                key={review.id} 
                                // LOGIC SIZE CARD ADAPTIF
                                // TikTok: Lebar 280px (Ramping)
                                // YouTube: Lebar 320px - 450px (Lebar)
                                className={`flex flex-none snap-center flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/70 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                                    isTikTok ? 'w-[76vw] max-w-[280px] sm:w-[280px]' : 'w-[85vw] max-w-[360px] sm:w-[340px] md:w-[450px]'
                                }`}
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
                                <div className="flex grow flex-col bg-white p-3.5 sm:p-4">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className="border-slate-300 text-[10px] font-bold text-slate-700">
                                            {review.reviewer_name}
                                        </Badge>
                                        <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400">{review.platform}</span>
                                    </div>
                                    
                                    {review.highlight_quote && (
                                        <div className="relative mt-1 rounded-2xl border border-slate-100 bg-slate-50 px-3.5 py-3 sm:px-4">
                                            <MessageSquareQuote className="absolute left-3 top-3 h-5 w-5 text-slate-200" />
                                            <p className="relative z-10 pl-6 text-[13px] font-medium italic leading-relaxed text-slate-600 line-clamp-5 sm:text-sm">
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
            <div className="flex items-center gap-4 rounded-[24px] border border-blue-100 bg-blue-50 p-5 sm:rounded-[28px] sm:p-6">
                 <div className="rounded-full bg-blue-100 p-3 text-blue-600">
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
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 sm:mb-6 sm:text-xl">
                <Cpu className="w-5 h-5 text-slate-700" /> Spesifikasi Teknis
            </h2>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm shadow-sm">
              <SpecSectionHeader label="Body & Desain" />
              <div className="divide-y divide-slate-50">
                <SpecRow label="Dimensi" value={product.spesifikasi?.dimensi} />
                <SpecRow label="Berat" value={product.spesifikasi?.berat} />
                <SpecRow label="Ketahanan" value={product.spesifikasi?.rating_ip} />
              </div>
              <SpecSectionHeader label="Layar" icon={Monitor} />
              <div className="divide-y divide-slate-50">
                <SpecRow label="Tipe Panel" value={product.spesifikasi?.tipe_layar} />
                <SpecRow label="Ukuran" value={product.spesifikasi?.ukuran_layar ? `${product.spesifikasi.ukuran_layar} Inci` : "-"} />
                <SpecRow label="Resolusi" value={product.spesifikasi?.resolusi} />
              </div>
              <SpecSectionHeader label="Hardware" icon={Cpu} />
              <div className="divide-y divide-slate-50">
                <SpecContentRow label="Chipset" emphasize>
                  <span className="text-sm font-bold text-blue-900">{cleanString(product.spesifikasi?.chipset)}</span>
                </SpecContentRow>
                <SpecContentRow label="RAM/ROM">
                  <div>
                    {displayedVariantLabels.length > 0
                      ? renderVarian(displayedVariantLabels)
                      : renderVarian(product.spesifikasi?.varian_internal)}
                  </div>
                </SpecContentRow>
                <SpecBooleanRow
                  label="Slot MicroSD"
                  value={Boolean(product.spesifikasi?.ada_slot_memori)}
                  trueLabel="Ada"
                  falseLabel="Tidak Ada"
                />
              </div>
              <SpecSectionHeader label="Kamera" icon={Camera} />
              <div className="divide-y divide-slate-50">
                 <SpecRow label="Kamera Utama" value={product.spesifikasi?.kamera_utama_mp ? `${product.spesifikasi.kamera_utama_mp} MP` : "-"} />
                 <SpecRow label="Fitur" value={product.spesifikasi?.detail_kamera_utama} />
                 <SpecRow label="Video Belakang" value={product.spesifikasi?.kamera_utama_video} />
                 <SpecRow label="Kamera Selfie" value={product.spesifikasi?.kamera_selfie_mp ? `${product.spesifikasi.kamera_selfie_mp} MP` : "-"} />
              </div>
              <SpecSectionHeader label="Fitur & Lainnya" />
              <div className="divide-y divide-slate-50">
                <SpecBooleanRow
                  label="NFC"
                  value={Boolean(product.spesifikasi?.ada_nfc)}
                  trueLabel="Support"
                  falseLabel="Tidak Support"
                />
                <SpecContentRow label="Baterai">
                  <div>
                    <span className="text-sm font-semibold text-slate-900">
                      {product.spesifikasi?.kapasitas_baterai ? `${product.spesifikasi.kapasitas_baterai} mAh` : "-"}
                    </span>
                    <span className="mt-1 block text-xs text-slate-400">{cleanString(product.spesifikasi?.kecepatan_cas)}</span>
                  </div>
                </SpecContentRow>
                <SpecRow label="Speaker" value={product.spesifikasi?.sound_loudspeaker} />
                <SpecBooleanRow
                  label="3.5mm Jack"
                  value={Boolean(product.spesifikasi?.sound_jack)}
                  trueLabel="Ada"
                  falseLabel="Tidak Ada"
                />
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

const SpecSectionHeader = ({ label, icon: Icon }: { label: string; icon?: LucideIcon }) => (
  <div className="flex items-center gap-2 border-y border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/70 px-6 py-3">
    {Icon ? <Icon className="h-4 w-4 text-slate-500" /> : null}
    <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600">{label}</span>
  </div>
);

const SpecContentRow = ({
  label,
  children,
  emphasize = false,
}: {
  label: string;
  children: ReactNode;
  emphasize?: boolean;
}) => (
  // Helper ini dipakai untuk semua row spesifikasi agar ritme label/value konsisten
  // dan lebih mudah dipindai di desktop maupun mobile.
  <div className="grid gap-2 px-6 py-4 transition-colors hover:bg-slate-50/50 sm:grid-cols-[180px,1fr] sm:gap-6">
    <span className="text-sm font-medium text-slate-500">{label}</span>
    <div className={emphasize ? "text-sm font-semibold text-slate-900 break-words" : "break-words"}>{children}</div>
  </div>
);

const SpecRow = ({ label, value }: { label: string; value: unknown }) => (
  <SpecContentRow label={label}>
    <span className="text-sm font-medium text-slate-900">{cleanString(value)}</span>
  </SpecContentRow>
);

const SpecBooleanRow = ({
  label,
  value,
  trueLabel,
  falseLabel,
}: {
  label: string;
  value: boolean;
  trueLabel: string;
  falseLabel: string;
}) => (
  <SpecContentRow label={label}>
    <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
      {value ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-slate-400" />}
      {value ? trueLabel : falseLabel}
    </span>
  </SpecContentRow>
);



