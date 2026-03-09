export function formatMarketplaceDisplayName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return "Marketplace";

  const normalized = trimmed.toLowerCase();
  if (normalized.includes("shopee")) return "Shopee";
  if (normalized.includes("tokopedia")) return "Tokopedia";
  if (normalized.includes("blibli")) return "Blibli";
  if (normalized.includes("lazada")) return "Lazada";

  return trimmed;
}

export function formatProductCondition(condition: string | null | undefined): string {
  const normalized = condition?.trim().toLowerCase();
  if (normalized === "bekas" || normalized === "second") return "Bekas";
  return "Baru";
}

export function formatStoreLine(
  storeName: string | null | undefined,
  marketplaceName: string | null | undefined,
  condition: string | null | undefined,
): string {
  const primaryLabel = storeName?.trim() || formatMarketplaceDisplayName(marketplaceName);

  // Teks user-facing diringkas ke satu pola agar card publik tidak menampilkan
  // campuran separator, huruf kecil, dan istilah internal yang berbeda-beda.
  return `${primaryLabel} • ${formatProductCondition(condition)}`;
}
