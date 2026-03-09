import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Scale, ShoppingBag, Smartphone } from "lucide-react";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatMarketplaceDisplayName } from "@/lib/public-display";
import { formatPublicVariantLabel, formatVariantLabelFromNumbers } from "@/lib/variant-label";
import { cn } from "@/lib/utils";
import { Produk } from "@/types";

interface ProductCardProps {
  product: Produk;
  isSelected?: boolean;
  onCompare?: (slug: string) => void;
}

// Helper Gambar
const getImageUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  if (cleanPath.startsWith("uploads/")) return `/${cleanPath}`;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  try {
    const baseUrl = new URL(apiUrl).origin;
    return `${baseUrl}/storage/${cleanPath}`;
  } catch {
    return null;
  }
};

function getVariantLabel(variant: NonNullable<Produk["variants"]>[number]): string | null {
  const normalized = formatPublicVariantLabel(variant.label, {
    isDefault: variant.is_default,
    fallbackId: variant.id,
  });
  if (normalized) return normalized;

  if (variant.ram_gb > 0 && variant.storage_gb > 0) {
    return formatVariantLabelFromNumbers(variant.ram_gb, variant.storage_gb);
  }

  return null;
}

export default function ProductCard({ product, isSelected, onCompare }: ProductCardProps) {
  const formatRupiahAmount = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 0,
    }).format(value);

  const detailUrl = `/produk/${product.slug}`;
  const imageUrl = getImageUrl(product.foto);
  const brandLogoUrl = product.brand?.logo ? getImageUrl(product.brand.logo) : null;

  // Harga card tetap "mulai dari termurah" lintas varian.
  const sortedLinks = [...(product.marketplace_links || [])].sort((a, b) => a.harga - b.harga);
  const cheapestLink = sortedLinks.length > 0 ? sortedLinks[0] : null;
  const displayPrice = cheapestLink ? cheapestLink.harga : (product.harga_terendah_baru || 0);
  const displayMarketplaceName = cheapestLink
    ? formatMarketplaceDisplayName(cheapestLink.nama_marketplace)
    : "Harga Pasar";
  const hasEcommerce = Boolean(cheapestLink);
  const priceFreshness = product.price_data_status || "unknown";

  const variantCount = (product.variants ?? []).filter((variant) => {
    if (variant.status_aktif === false) return false;
    if (variant.ram_gb > 0 && variant.storage_gb > 0) return true;
    const label = variant.label?.trim() ?? "";
    return /\d+\s*\/\s*\d+/i.test(label);
  }).length;
  const variantLinks = (product.variants ?? [])
    .filter((variant) => variant.status_aktif !== false)
    .map((variant) => ({
      id: variant.id,
      label: getVariantLabel(variant),
      isDefault: variant.is_default || product.default_variant_id === variant.id,
    }))
    .filter((variant): variant is { id: number; label: string; isDefault: boolean } => Boolean(variant.label))
    .slice(0, 3);
  const hiddenVariantCount = Math.max(0, variantCount - variantLinks.length);
  const hasVariantPreview = variantLinks.length > 0;

  return (
    <div className="group h-full block">
      <Card
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-xl border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:rounded-2xl",
          isSelected ? "border-blue-600 ring-2 ring-blue-600" : "",
        )}
      >
        <div className="relative flex h-32 items-center justify-center overflow-hidden border-b border-slate-50 bg-white p-3.5 sm:h-40 sm:p-4 md:h-44 md:p-5">
          {onCompare ? (
            <button
              type="button"
              onClick={() => onCompare(product.slug)}
              className={cn(
                "absolute left-2.5 top-2.5 z-20 flex select-none items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold shadow-sm transition-all sm:left-3 sm:top-3 sm:px-2.5 sm:py-1.5",
                isSelected
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white/90 text-slate-500 backdrop-blur-sm hover:text-blue-600",
              )}
              aria-label={isSelected ? "Batalkan bandingkan" : "Bandingkan produk"}
            >
              <Scale className="h-3 w-3" />
              <span className="hidden md:inline">{isSelected ? "Terpilih" : "Bandingkan"}</span>
            </button>
          ) : null}

          {brandLogoUrl ? (
            <div className="absolute bottom-2.5 left-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-slate-100 bg-white p-1 shadow-sm sm:bottom-3 sm:left-3 sm:h-8 sm:w-8">
              <Image src={brandLogoUrl} alt="brand" width={32} height={32} className="object-contain" unoptimized />
            </div>
          ) : null}

          {imageUrl ? (
            <div className="relative h-full w-full transition-transform duration-500 group-hover:scale-105">
              <Image
                src={imageUrl}
                alt={product.nama_produk}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 33vw"
                unoptimized
              />
            </div>
          ) : (
            <div className="rounded-full bg-slate-50 p-4">
              <Smartphone className="h-10 w-10 text-slate-300" />
            </div>
          )}
        </div>

        <CardContent className="flex grow flex-col p-3 sm:p-3.5 md:p-4">
          <Link href={detailUrl} className="block">
            <h3 className="mb-1 line-clamp-2 min-h-[2.45rem] text-xs font-bold leading-snug text-slate-800 transition-colors group-hover:text-blue-600 sm:min-h-[2.8rem] sm:text-[13px] md:min-h-[3rem] md:text-sm">
              {product.nama_produk}
            </h3>
          </Link>

          <p className="mb-2 min-h-[1rem] truncate text-[10px] text-slate-400">
            {product.tahun_rilis || "-"} - {product.spesifikasi?.chipset || "Spesifikasi belum lengkap"}
          </p>

          <div className="mb-2 min-h-[3.6rem] space-y-1 sm:min-h-[4.25rem] sm:space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Mulai dari
              </span>
              {variantCount > 0 ? (
                <Badge variant="secondary" className="h-4.5 bg-blue-50 px-1.5 text-[9px] font-bold text-blue-700">
                  {variantCount} Varian
                </Badge>
              ) : null}
            </div>
            <div className="flex items-end gap-1.5 text-slate-900">
              {/* `Rp` dipisah dari nominal utama supaya card sempit tidak memecah harga
                  menjadi dua baris yang terasa berantakan di desktop kecil maupun mobile. */}
              <span className="pb-0.5 text-[11px] font-bold text-slate-600 sm:text-xs">Rp</span>
              <span className="text-[1.2rem] font-black leading-none tabular-nums tracking-tight text-slate-900 sm:text-[1.35rem] md:text-[1.5rem]">
                {displayPrice ? formatRupiahAmount(displayPrice) : "-"}
              </span>
            </div>
          </div>

          <div className="mb-2 min-h-[1.75rem] content-start flex flex-wrap gap-1 sm:min-h-[2.25rem] sm:gap-1.5">
              {/* Chip varian di card langsung mengarah ke detail page dengan query `variant`,
                  jadi user bisa lompat ke harga varian yang dipilih tanpa menambah dropdown di card.
                  Min-height dijaga agar posisi badge marketplace dan tombol bawah lebih konsisten antarkartu. */}
              {hasVariantPreview
                ? (
                    <>
                      {variantLinks.map((variant, index) => (
                        <Link
                          key={`${product.id}-${variant.id}`}
                          href={`${detailUrl}?variant=${variant.id}`}
                          className={cn(
                            "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold transition-colors sm:px-2 sm:py-1 sm:text-[10px]",
                            // Mobile hanya menampilkan dua chip pertama agar tinggi card tetap pendek.
                            index >= 2 ? "hidden sm:inline-flex" : "",
                            // Default variant ditandai lebih menonjol agar user langsung tahu
                            // titik masuk utama produk parent ini.
                            variant.isDefault
                              ? "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",
                          )}
                        >
                          {variant.label}
                        </Link>
                      ))}
                      {hiddenVariantCount > 0 ? (
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 sm:px-2 sm:py-1 sm:text-[10px]">
                          +{hiddenVariantCount} varian
                        </span>
                      ) : null}
                    </>
                  )
                : <span className="text-[10px] font-medium text-slate-300">Varian belum ditampilkan</span>}
            </div>

          <div className="mt-auto">
            <div className="flex min-h-[2.8rem] flex-col justify-end rounded-xl bg-slate-50 px-2.5 py-1.5 sm:min-h-[3.35rem] sm:rounded-2xl sm:px-3 sm:py-2">
              <div className="flex items-center gap-1.5">
                {hasEcommerce ? (
                  <div className="flex min-w-0 items-center gap-1 text-[10px] font-medium text-slate-500">
                    <span className="shrink-0">Termurah di</span>
                    <Badge className="h-4.5 max-w-full rounded-md border-green-200 bg-green-50 px-1.5 py-0 text-[9px] font-bold text-green-700 sm:h-5 sm:text-[10px]">
                      <ShoppingBag className="mr-1 h-3 w-3" /> {displayMarketplaceName}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">Data pasar manual</span>
                )}
              </div>

              {hasEcommerce ? (
                <div className="mt-0.5 hidden items-center gap-1 text-[10px] font-medium text-slate-500 sm:flex">
                  {priceFreshness === "stale" ? (
                    <>
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                      Harga perlu cek ulang
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      Harga relatif fresh
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-3 pt-0 sm:p-3.5 sm:pt-0 md:p-4 md:pt-0">
          <Link
            href={detailUrl}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-8 w-full justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] font-bold text-slate-500 transition-all group-hover:bg-slate-900 group-hover:text-white sm:h-9 sm:px-3.5 sm:text-xs",
            )}
          >
            <span>Lihat Detail</span>
            <ArrowUpRight className="h-3 w-3 opacity-50 group-hover:opacity-100" />
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
