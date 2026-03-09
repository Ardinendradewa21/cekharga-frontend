"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { formatMarketplaceDisplayName, formatStoreLine } from "@/lib/public-display";
import { formatPublicVariantLabel } from "@/lib/variant-label";
import { formatRupiah } from "@/lib/format";

type MarketplaceLinkItem = {
  id: number;
  nama_marketplace: string;
  nama_toko: string | null;
  harga: number;
  url_produk: string;
  kondisi: string;
  status_aktif: boolean;
  marketplace?: {
    nama?: string;
    logo?: string | null;
    warna_hex?: string;
    text_color?: string;
  } | null;
};

type VariantItem = {
  id: number;
  label: string | null;
  is_default: boolean;
  status_aktif?: boolean;
  prices: MarketplaceLinkItem[];
};

type VariantPriceSwitcherProps = {
  variants: VariantItem[];
  fallbackLinks: MarketplaceLinkItem[];
  initialVariantId?: number | null;
};

function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  if (cleanPath.startsWith("uploads/")) return `/${cleanPath}`;
  return null;
}

function getMarketplaceFallback(name: string) {
  const value = name.toLowerCase();
  if (value.includes("shopee")) {
    return { accentColor: "#EE4D2D", label: "Shopee" };
  }
  if (value.includes("tokopedia")) {
    return { accentColor: "#03AC0E", label: "Tokopedia" };
  }
  if (value.includes("blibli")) {
    return { accentColor: "#0095DA", label: "Blibli" };
  }
  if (value.includes("lazada")) {
    return { accentColor: "#0f146d", label: "Lazada" };
  }
  return { accentColor: "#0f172a", label: name };
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return `rgba(15, 23, 42, ${alpha})`;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function VariantPriceSwitcher({
  variants,
  fallbackLinks,
  initialVariantId,
}: VariantPriceSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const availableVariants = useMemo(() => {
    const activeOnly = variants.filter((variant) => variant.status_aktif !== false);
    // Detail page hanya sebaiknya menawarkan varian aktif.
    // Fallback ke semua varian hanya untuk jaga-jaga saat data lama belum lengkap.
    return activeOnly.length > 0 ? activeOnly : variants;
  }, [variants]);

  const defaultVariant =
    availableVariants.find((variant) => variant.is_default) ?? availableVariants[0] ?? null;
  const initialActiveVariant = useMemo(() => {
    if (typeof initialVariantId === "number" && Number.isFinite(initialVariantId) && initialVariantId > 0) {
      return availableVariants.find((variant) => variant.id === initialVariantId) ?? defaultVariant;
    }
    return defaultVariant;
  }, [availableVariants, defaultVariant, initialVariantId]);
  const initialActiveVariantId = initialActiveVariant?.id ?? 0;
  const [activeVariantId, setActiveVariantId] = useState<number>(initialActiveVariantId);

  useEffect(() => {
    setActiveVariantId(initialActiveVariantId);
  }, [initialActiveVariantId]);

  const activeVariant = useMemo(() => {
    if (!activeVariantId) return defaultVariant;
    return availableVariants.find((variant) => variant.id === activeVariantId) ?? defaultVariant;
  }, [activeVariantId, availableVariants, defaultVariant]);

  const links = useMemo(() => {
    if (!activeVariant) {
      return [...fallbackLinks]
        .filter((link) => link.status_aktif !== false)
        .sort((a, b) => a.harga - b.harga);
    }

    return [...activeVariant.prices]
      .filter((link) => link.status_aktif !== false)
      .sort((a, b) => a.harga - b.harga);
  }, [activeVariant, fallbackLinks]);

  const lowestPriceId = links[0]?.id ?? null;
  const lowestPriceLink = links[0] ?? null;
  const formatVariantLabel = (variant: VariantItem): string => {
    return (
      formatPublicVariantLabel(variant.label, {
        isDefault: variant.is_default,
        fallbackId: variant.id,
      }) ?? `Varian #${variant.id}`
    );
  };

  const activeVariantLabel = activeVariant ? formatVariantLabel(activeVariant) : null;
  const leadingMarketplaceName = formatMarketplaceDisplayName(
    lowestPriceLink?.nama_marketplace || lowestPriceLink?.marketplace?.nama || "Marketplace",
  );
  const hasVariantChoice = availableVariants.length > 1;

  function handleVariantChange(variantId: number) {
    setActiveVariantId(variantId);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("variant", String(variantId));

    // URL query ikut diperbarui supaya state varian bisa di-share / di-refresh
    // tanpa perlu mengubah logika fetch server-side yang sudah ada.
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {availableVariants.length > 0 ? (
        <div className="space-y-3">
          {hasVariantChoice ? (
            <>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pilih Varian</label>
                <span className="text-xs text-slate-400">Harga dan toko akan menyesuaikan pilihanmu.</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {availableVariants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => handleVariantChange(variant.id)}
                    aria-pressed={activeVariant?.id === variant.id}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      activeVariant?.id === variant.id
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
                    }`}
                  >
                    {formatVariantLabel(variant)}
                  </button>
                ))}
              </div>
            </>
          ) : activeVariantLabel ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Varian Tersedia</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{activeVariantLabel}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {lowestPriceLink ? (
        <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Ringkasan dijadikan strip metadata pendek supaya panel kiri tidak terasa
              punya "card di dalam card" sebelum daftar toko yang menjadi aksi utama. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-bold text-blue-700">
              {activeVariantLabel ?? "Varian Utama"}
            </span>
            <span>{links.length} toko aktif</span>
            <span className="text-slate-300">/</span>
            <span>Termurah di {leadingMarketplaceName}</span>
          </div>
          <span className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
            {formatRupiah(lowestPriceLink.harga)}
          </span>
        </div>
      ) : null}

      <div className="space-y-2.5">
        {links.length > 0 ? (
          links.map((link) => {
            const marketplace = link.marketplace;
            const marketplaceName = formatMarketplaceDisplayName(
              marketplace?.nama || link.nama_marketplace || "Marketplace",
            );
            const fallback = getMarketplaceFallback(marketplaceName);
            const accentColor = marketplace?.warna_hex || fallback.accentColor;
            const logo = getImageUrl(marketplace?.logo);
            const badgeStyle = {
              borderColor: hexToRgba(accentColor, 0.25),
              backgroundColor: hexToRgba(accentColor, 0.1),
              color: accentColor,
            };
            const cardStyle = {
              borderLeftColor: accentColor,
            };

            return (
              <a key={link.id} href={link.url_produk} target="_blank" rel="noreferrer" className="group block">
                <div
                  className="relative rounded-2xl border border-slate-200 border-l-4 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-3.5"
                  style={cardStyle}
                >
                  <div className="flex w-full items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-2 shadow-sm sm:h-11 sm:w-11">
                      {logo ? (
                        <Image
                          src={logo}
                          alt={marketplaceName}
                          width={40}
                          height={40}
                          className="h-full w-full object-contain"
                          unoptimized
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">{fallback.label}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 text-slate-900">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full border px-2 py-0.5 text-[10px] font-bold" style={badgeStyle}>
                          {marketplaceName}
                        </span>
                        {lowestPriceId === link.id ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Termurah
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="whitespace-nowrap text-base font-black tracking-tight sm:text-lg">
                          {formatRupiah(link.harga)}
                        </span>
                      </div>
                      <span className="mt-1 block truncate text-[11px] font-medium text-slate-500">
                        {formatStoreLine(link.nama_toko, marketplaceName, link.kondisi)}
                      </span>
                    </div>

                    <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm transition-transform group-hover:scale-105 sm:px-4 sm:py-2">
                      Beli
                    </div>
                  </div>
                </div>
              </a>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">
            Belum ada harga aktif pada varian ini.
          </div>
        )}
      </div>
    </div>
  );
}
