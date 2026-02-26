"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

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
  label: string;
  is_default: boolean;
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
    return { classColor: "bg-[#EE4D2D]", label: "Shopee" };
  }
  if (value.includes("tokopedia")) {
    return { classColor: "bg-[#03AC0E]", label: "Tokopedia" };
  }
  if (value.includes("blibli")) {
    return { classColor: "bg-[#0095DA]", label: "Blibli" };
  }
  if (value.includes("lazada")) {
    return { classColor: "bg-[#0f146d]", label: "Lazada" };
  }
  return { classColor: "bg-slate-900", label: name };
}

export function VariantPriceSwitcher({
  variants,
  fallbackLinks,
  initialVariantId,
}: VariantPriceSwitcherProps) {
  const defaultVariant = variants.find((variant) => variant.is_default) ?? variants[0] ?? null;
  const initialSelectedVariant = useMemo(() => {
    if (typeof initialVariantId === "number" && Number.isFinite(initialVariantId) && initialVariantId > 0) {
      return variants.find((variant) => variant.id === initialVariantId) ?? defaultVariant;
    }
    return defaultVariant;
  }, [defaultVariant, initialVariantId, variants]);
  const initialSelectedVariantId = initialSelectedVariant?.id ?? 0;
  const [selectedVariantId, setSelectedVariantId] = useState<number>(initialSelectedVariantId);

  useEffect(() => {
    setSelectedVariantId(initialSelectedVariantId);
  }, [initialSelectedVariantId]);

  const selectedVariant = useMemo(() => {
    if (!selectedVariantId) return defaultVariant;
    return variants.find((variant) => variant.id === selectedVariantId) ?? defaultVariant;
  }, [defaultVariant, selectedVariantId, variants]);

  const links = useMemo(() => {
    const sourceLinks =
      selectedVariant && selectedVariant.prices.length > 0 ? selectedVariant.prices : fallbackLinks;

    return [...sourceLinks]
      .filter((link) => link.status_aktif !== false)
      .sort((a, b) => a.harga - b.harga);
  }, [fallbackLinks, selectedVariant]);

  const lowestPriceId = links[0]?.id ?? null;
  const formatRupiah = (value: number): string =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-3">
      {variants.length > 0 ? (
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pilih Varian</label>
          <select
            value={selectedVariant?.id ?? 0}
            onChange={(event) => setSelectedVariantId(Number(event.target.value))}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="space-y-3">
        {links.length > 0 ? (
          links.map((link) => {
            const marketplace = link.marketplace;
            const marketplaceName = marketplace?.nama || link.nama_marketplace || "Marketplace";
            const fallback = getMarketplaceFallback(marketplaceName);
            const hasDbColor = Boolean(marketplace?.warna_hex);
            const style = hasDbColor ? { backgroundColor: marketplace?.warna_hex } : undefined;
            const textColor = marketplace?.text_color || "#ffffff";
            const logo = getImageUrl(marketplace?.logo);

            return (
              <a key={link.id} href={link.url_produk} target="_blank" rel="noreferrer" className="group block">
                <div
                  className={`relative flex items-center justify-between overflow-hidden rounded-xl border border-transparent p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${hasDbColor ? "" : fallback.classColor}`}
                  style={style}
                >
                  <div className="flex w-full items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1.5 shadow-sm">
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

                    <div className="min-w-0 flex-1" style={{ color: textColor }}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="whitespace-nowrap text-lg font-black tracking-tight">
                          {formatRupiah(link.harga)}
                        </span>
                        {lowestPriceId === link.id ? (
                          <span className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-green-700 shadow-sm">
                            Termurah
                          </span>
                        ) : null}
                      </div>
                      <span className="block truncate text-[11px] font-medium opacity-90">
                        {link.nama_toko || marketplaceName} - {link.kondisi}
                      </span>
                    </div>

                    <div className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm transition-transform group-hover:scale-105">
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

