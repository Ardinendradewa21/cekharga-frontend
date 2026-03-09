type VariantLabelOptions = {
  isDefault?: boolean;
  fallbackId?: number | null;
};

export function formatStorageCapacity(storageValue: number): string {
  if (storageValue >= 1024 && storageValue % 1024 === 0) {
    return `${storageValue / 1024}TB`;
  }

  return `${storageValue}GB`;
}

export function formatVariantLabelFromNumbers(ramGb: number, storageGb: number): string {
  return `${ramGb}/${formatStorageCapacity(storageGb)}`;
}

export function formatPublicVariantLabel(
  rawLabel: string | null | undefined,
  options: VariantLabelOptions = {},
): string | null {
  const trimmed = rawLabel?.trim();

  // UI publik tidak perlu menampilkan istilah teknis "Default".
  if (!trimmed || /^default$/i.test(trimmed)) {
    if (options.isDefault) return "Varian Utama";
    if (typeof options.fallbackId === "number" && options.fallbackId > 0) {
      return `Varian #${options.fallbackId}`;
    }
    return null;
  }

  // Jika admin mengetik "8/256" tanpa suffix unit, UI publik menormalkannya
  // menjadi "8/256GB" supaya konsisten di card dan detail page.
  const simpleMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)(?:\s*(GB|TB))?$/i);
  if (simpleMatch) {
    const ramGb = Number(simpleMatch[1]);
    const storageValue = Number(simpleMatch[2]);
    const storageUnit = simpleMatch[3]?.toUpperCase();

    if (storageUnit === "TB") {
      return `${ramGb}/${storageValue}TB`;
    }

    return `${ramGb}/${storageValue}GB`;
  }

  return trimmed;
}
