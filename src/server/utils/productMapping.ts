export type ExtractedVariantSpec = {
  ramGb: number | null;
  storageGb: number | null;
  normalizedTitle: string;
  matchedPattern: string | null;
};

export type VariantMatcherInput = {
  id: number | bigint;
  ram_gb: number;
  storage_gb: number;
  warna?: string | null;
  label?: string | null;
  sku?: string | null;
};

export type VariantMatchResult<TVariant extends VariantMatcherInput = VariantMatcherInput> = {
  variant: TVariant | null;
  extracted: ExtractedVariantSpec;
};

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[()[\]{}]/g, " ")
    .replace(/[_|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCapacityValue(raw: string, unit: string | undefined): number | null {
  const numeric = Number(raw.replace(",", "."));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  const normalizedUnit = (unit ?? "gb").toLowerCase();
  if (normalizedUnit === "tb") {
    return Math.round(numeric * 1024);
  }

  return Math.round(numeric);
}

function isRamCandidate(value: number | null): value is number {
  return typeof value === "number" && value >= 1 && value <= 48;
}

function isStorageCandidate(value: number | null): value is number {
  return typeof value === "number" && value >= 16 && value <= 4096;
}

function extractByRegex(
  normalized: string,
  regex: RegExp,
  ramIndex: number,
  ramUnitIndex: number | null,
  storageIndex: number,
  storageUnitIndex: number | null,
  patternName: string,
): ExtractedVariantSpec | null {
  const match = normalized.match(regex);
  if (!match) return null;

  const ram = parseCapacityValue(match[ramIndex] ?? "", ramUnitIndex !== null ? match[ramUnitIndex] : undefined);
  const storage = parseCapacityValue(
    match[storageIndex] ?? "",
    storageUnitIndex !== null ? match[storageUnitIndex] : undefined,
  );

  if (!isRamCandidate(ram) || !isStorageCandidate(storage)) {
    return null;
  }

  return {
    ramGb: ram,
    storageGb: storage,
    normalizedTitle: normalized,
    matchedPattern: patternName,
  };
}

function extractFromLooseUnits(normalized: string): ExtractedVariantSpec | null {
  const unitRegex = /(\d{1,4}(?:[.,]\d+)?)\s*(tb|gb|g)\b/gi;
  const values: number[] = [];

  for (const match of normalized.matchAll(unitRegex)) {
    const parsed = parseCapacityValue(match[1] ?? "", match[2] ?? undefined);
    if (parsed !== null) {
      values.push(parsed);
    }
  }

  if (values.length < 2) return null;

  for (let index = 0; index < values.length - 1; index += 1) {
    const first = values[index];
    const second = values[index + 1];
    if (isRamCandidate(first) && isStorageCandidate(second) && second >= first) {
      return {
        ramGb: first,
        storageGb: second,
        normalizedTitle: normalized,
        matchedPattern: "loose-unit-sequence",
      };
    }
  }

  return null;
}

export function extractRamRomFromTitle(title: string): ExtractedVariantSpec {
  const normalized = normalizeTitle(title);

  // Pola paling umum dari seller: "8/256", "8-256", atau "8x256".
  const compactPair =
    extractByRegex(normalized, /(\d{1,2})\s*(?:\/|x|-|\+)\s*(\d{2,4})\b/i, 1, null, 2, null, "compact-pair") ??
    extractByRegex(
      normalized,
      /(\d{1,2}(?:[.,]\d+)?)\s*(tb|gb|g)\s*(?:\/|x|-|\+)\s*(\d{2,4}(?:[.,]\d+)?)\s*(tb|gb|g)?\b/i,
      1,
      2,
      3,
      4,
      "compact-pair-with-unit",
    );
  if (compactPair) return compactPair;

  // Pola eksplisit ber-keyword: "RAM 8GB ROM 256GB" / "Storage 256GB RAM 8GB".
  const explicitRamRom =
    extractByRegex(
      normalized,
      /ram[^0-9]{0,10}(\d{1,2}(?:[.,]\d+)?)\s*(tb|gb|g)?[^0-9]{0,12}(?:rom|storage|memori|internal)[^0-9]{0,10}(\d{2,4}(?:[.,]\d+)?)\s*(tb|gb|g)?/i,
      1,
      2,
      3,
      4,
      "explicit-ram-rom",
    ) ??
    extractByRegex(
      normalized,
      /(?:rom|storage|memori|internal)[^0-9]{0,10}(\d{2,4}(?:[.,]\d+)?)\s*(tb|gb|g)?[^0-9]{0,12}ram[^0-9]{0,10}(\d{1,2}(?:[.,]\d+)?)\s*(tb|gb|g)?/i,
      3,
      4,
      1,
      2,
      "explicit-rom-ram",
    );
  if (explicitRamRom) return explicitRamRom;

  const looseUnits = extractFromLooseUnits(normalized);
  if (looseUnits) return looseUnits;

  return {
    ramGb: null,
    storageGb: null,
    normalizedTitle: normalized,
    matchedPattern: null,
  };
}

export function formatVariantLabel(variant: Pick<VariantMatcherInput, "label" | "ram_gb" | "storage_gb" | "warna">): string {
  const customLabel = variant.label?.trim();
  if (customLabel) return customLabel;

  const base = `${variant.ram_gb}/${variant.storage_gb}GB`;
  const warna = variant.warna?.trim();
  return warna ? `${base} ${warna}` : base;
}

function matchByColor<TVariant extends VariantMatcherInput>(
  title: string,
  variants: TVariant[],
): TVariant | null {
  if (variants.length <= 1) return variants[0] ?? null;
  const normalized = normalizeTitle(title);

  for (const variant of variants) {
    const warna = variant.warna?.trim().toLowerCase();
    if (!warna) continue;
    if (normalized.includes(warna)) {
      return variant;
    }
  }

  return variants[0] ?? null;
}

export function findBestVariantMatchByTitle<TVariant extends VariantMatcherInput>(
  title: string,
  variants: TVariant[],
): VariantMatchResult<TVariant> {
  const extracted = extractRamRomFromTitle(title);
  if (variants.length === 0 || extracted.ramGb === null || extracted.storageGb === null) {
    return { variant: null, extracted };
  }

  const directMatches = variants.filter(
    (variant) => variant.ram_gb === extracted.ramGb && variant.storage_gb === extracted.storageGb,
  );

  if (directMatches.length === 0) {
    return { variant: null, extracted };
  }

  const best = matchByColor(title, directMatches);
  return { variant: best, extracted };
}
