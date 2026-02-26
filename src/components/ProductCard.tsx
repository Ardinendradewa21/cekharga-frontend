import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, ArrowUpRight, Clock, Scale, ShoppingBag, Smartphone } from "lucide-react";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Produk, ProductVariant } from "@/types";

interface ProductCardProps {
  product: Produk;
  isSelected?: boolean;
  onCompare?: (slug: string) => void;
}

type VariantOption = {
  id: number;
  label: string;
};

// Helper Time Ago (Singkat dan Padat)
const timeAgo = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins}m lalu`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}j lalu`;
  return `${Math.floor(diffMins / 1440)}h lalu`;
};

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

function formatStorageLabel(storageGb: number): string {
  if (storageGb >= 1024 && storageGb % 1024 === 0) {
    return `${storageGb / 1024}TB`;
  }
  return `${storageGb}GB`;
}

function formatVariantLabel(variant: ProductVariant): string {
  if (variant.ram_gb > 0 && variant.storage_gb > 0) {
    return `${variant.ram_gb}/${formatStorageLabel(variant.storage_gb)}`;
  }

  const fallbackLabel = variant.label?.trim();
  return fallbackLabel && fallbackLabel.length > 0 ? fallbackLabel : "";
}

function buildVariantOptions(product: Produk): VariantOption[] {
  const variants = (product.variants ?? [])
    .filter((variant) => {
      if (variant.status_aktif === false) return false;
      if (variant.ram_gb > 0 && variant.storage_gb > 0) return true;
      const label = variant.label?.trim() ?? "";
      return /\d+\s*\/\s*\d+/i.test(label);
    })
    .sort((a, b) => {
      if (a.ram_gb !== b.ram_gb) return a.ram_gb - b.ram_gb;
      if (a.storage_gb !== b.storage_gb) return a.storage_gb - b.storage_gb;
      return a.id - b.id;
    })
    .map((variant) => ({
      id: variant.id,
      label: formatVariantLabel(variant),
    }))
    .filter((variant) => variant.label.length > 0);

  const dedup = new Map<string, VariantOption>();
  for (const variant of variants) {
    if (!dedup.has(variant.label)) {
      dedup.set(variant.label, variant);
    }
  }

  return Array.from(dedup.values());
}

export default function ProductCard({ product, isSelected, onCompare }: ProductCardProps) {
  const formatRupiah = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    })
      .format(value)
      .replace("Rp", "Rp ");

  const detailUrl = `/produk/${product.slug}`;
  const imageUrl = getImageUrl(product.foto);
  const brandLogoUrl = product.brand?.logo ? getImageUrl(product.brand.logo) : null;

  // Harga card tetap "mulai dari termurah" lintas varian.
  const sortedLinks = [...(product.marketplace_links || [])].sort((a, b) => a.harga - b.harga);
  const cheapestLink = sortedLinks.length > 0 ? sortedLinks[0] : null;
  const displayPrice = cheapestLink ? cheapestLink.harga : (product.harga_terendah_baru || 0);
  const displayLabel = cheapestLink ? `via ${cheapestLink.nama_marketplace || "Toko Online"}` : "Harga Pasar Baru";
  const hasEcommerce = Boolean(cheapestLink);
  const priceSyncAt = product.price_last_updated_at || product.updated_at;
  const priceFreshness = product.price_data_status || "unknown";

  // Varian ditampilkan sebagai chip yang bisa diklik ke detail + preselect varian.
  const variantOptions = buildVariantOptions(product);
  const visibleVariantOptions = variantOptions.slice(0, 6);
  const hiddenVariantCount = Math.max(0, variantOptions.length - visibleVariantOptions.length);

  return (
    <div className="group h-full block">
      <Card
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-2xl border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
          isSelected ? "border-blue-600 ring-2 ring-blue-600" : "",
        )}
      >
        <div className="relative flex h-48 items-center justify-center overflow-hidden border-b border-slate-50 bg-white p-6">
          {priceSyncAt ? (
            <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2 py-1 text-[10px] font-bold text-slate-500 shadow-sm backdrop-blur">
              <Clock className={`h-3 w-3 ${priceFreshness === "stale" ? "text-amber-600" : "text-green-600"}`} />
              {timeAgo(priceSyncAt)}
            </div>
          ) : null}

          {onCompare ? (
            <button
              type="button"
              onClick={() => onCompare(product.slug)}
              className={cn(
                "absolute left-3 top-3 z-20 flex select-none items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-bold shadow-sm transition-all",
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
            <div className="absolute bottom-3 left-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-100 bg-white p-1 shadow-sm">
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

        <CardContent className="flex grow flex-col p-4">
          <Link href={detailUrl} className="block">
            <h3 className="mb-1 line-clamp-2 min-h-[2.5em] text-sm font-bold leading-snug text-slate-800 transition-colors group-hover:text-blue-600 md:text-base">
              {product.nama_produk}
            </h3>
          </Link>

          <p className="mb-3 truncate text-[10px] text-slate-400">
            {product.tahun_rilis || "-"} - {product.spesifikasi?.chipset || "Spesifikasi belum lengkap"}
          </p>

          {visibleVariantOptions.length > 0 ? (
            <div className="mb-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Varian Internal</p>
              <div className="flex flex-wrap gap-1.5">
                {visibleVariantOptions.map((variant) => (
                  <Link
                    key={variant.id}
                    href={`${detailUrl}?variant=${variant.id}`}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {variant.label}
                  </Link>
                ))}
                {hiddenVariantCount > 0 ? (
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500">
                    +{hiddenVariantCount} varian
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-auto">
            <div className="flex flex-col">
              <span className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {hasEcommerce ? "Harga Terbaik" : "Estimasi Harga"}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900 md:text-xl">
                  {displayPrice ? formatRupiah(displayPrice) : "Cek Stok"}
                </span>
              </div>

              <div className="mt-1 flex items-center gap-1.5">
                {hasEcommerce ? (
                  <Badge className="h-5 rounded-md border-green-200 bg-green-50 px-1.5 py-0 text-[10px] font-bold text-green-700">
                    <ShoppingBag className="mr-1 h-3 w-3" /> {displayLabel}
                  </Badge>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">Data pasar manual</span>
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

        <CardFooter className="p-4 pt-0">
          <Link
            href={detailUrl}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "w-full justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 text-xs font-bold text-slate-500 transition-all group-hover:bg-slate-900 group-hover:text-white",
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
