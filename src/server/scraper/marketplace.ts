import { load } from "cheerio";

type MarketplaceSource = "tokopedia" | "shopee" | "unknown";

export type MarketplaceScrapeResult = {
  success: boolean;
  price: number | null;
  source: string;
  error?: string;
};

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];

const PRICE_PARSE_FALLBACK_MESSAGE = "Failed to parse price automatically. Please input manually.";

const TOKOPEDIA_PRICE_SELECTORS = [
  '[data-testid="lblPDPDetailProductPrice"]',
  '[data-testid="lblPDPDetailProductPriceDesktop"]',
  '[data-testid="lblPDPDetailProductPriceMobile"]',
];

const SHOPEE_PRICE_SELECTORS = [
  '[data-testid="view_price"]',
  ".pqTWkA",
  "._2Shl1j",
];

function pickUserAgent() {
  const index = Math.floor(Math.random() * USER_AGENTS.length);
  return USER_AGENTS[index] ?? USER_AGENTS[0];
}

function detectSource(hostname: string): MarketplaceSource {
  const normalized = hostname.toLowerCase().replace(/^www\./, "");

  if (normalized.includes("tokopedia.com")) return "tokopedia";
  if (normalized.includes("shopee.")) return "shopee";
  return "unknown";
}

function normalizeNumericPrice(rawValue: number, source: MarketplaceSource): number | null {
  if (!Number.isFinite(rawValue) || rawValue <= 0) return null;

  let value = Math.trunc(rawValue);

  if (source === "shopee") {
    // Shopee terkadang menyimpan price sebagai integer ber-skala (contoh x100000).
    if (value >= 100_000_000_000 && value % 100_000 === 0) {
      value = Math.trunc(value / 100_000);
    } else if (value >= 100_000_000 && value % 100 === 0) {
      value = Math.trunc(value / 100);
    }
  }

  if (value <= 0) return null;
  return value;
}

function parsePriceFromText(input: string, source: MarketplaceSource): number | null {
  const normalized = input.replace(/\u00a0/g, " ").trim();
  if (!normalized) return null;

  const directCurrencyMatch = normalized.match(/(?:rp|idr)\s*([0-9][0-9.,\s]{2,})/i);
  if (directCurrencyMatch?.[1]) {
    const digits = directCurrencyMatch[1].replace(/[^\d]/g, "");
    const parsed = Number(digits);
    return normalizeNumericPrice(parsed, source);
  }

  const genericNumberMatches = normalized.match(/\d[\d.,\s]{3,}/g) ?? [];
  for (const candidate of genericNumberMatches) {
    const digits = candidate.replace(/[^\d]/g, "");
    const parsed = Number(digits);
    const value = normalizeNumericPrice(parsed, source);
    if (value !== null) return value;
  }

  if (/^\d{4,15}$/.test(normalized)) {
    const parsed = Number(normalized);
    return normalizeNumericPrice(parsed, source);
  }

  return null;
}

function parsePriceCandidate(value: unknown, source: MarketplaceSource): number | null {
  if (typeof value === "number") {
    return normalizeNumericPrice(value, source);
  }

  if (typeof value === "string") {
    return parsePriceFromText(value, source);
  }

  return null;
}

function isPriceKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (!lower) return false;

  if (/currency|symbol|label|format|prefix|suffix/.test(lower)) {
    return false;
  }

  return /(harga|price|amount|sale|current|final|lowprice|highprice|discount)/.test(lower);
}

function pickBestCandidate(candidates: number[]): number | null {
  for (const candidate of candidates) {
    if (candidate >= 1_000 && candidate <= 500_000_000) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (candidate > 0) return candidate;
  }

  return null;
}

function collectPriceFromJson(root: unknown, source: MarketplaceSource): number | null {
  const queue: Array<{ node: unknown; key: string }> = [{ node: root, key: "" }];
  const visited = new Set<object>();
  const candidates: number[] = [];
  let processed = 0;

  while (queue.length > 0 && processed < 30_000) {
    const current = queue.shift();
    if (!current) break;
    processed += 1;

    const { node, key } = current;

    if (node === null || node === undefined) {
      continue;
    }

    if (typeof node === "string" || typeof node === "number") {
      if (isPriceKey(key)) {
        const candidate = parsePriceCandidate(node, source);
        if (candidate !== null) {
          candidates.push(candidate);
        }
      }
      continue;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        queue.push({ node: item, key });
      }
      continue;
    }

    if (typeof node === "object") {
      if (visited.has(node)) continue;
      visited.add(node);

      const record = node as Record<string, unknown>;
      for (const [childKey, childValue] of Object.entries(record)) {
        const lowerKey = childKey.toLowerCase();

        if (isPriceKey(lowerKey)) {
          const candidate = parsePriceCandidate(childValue, source);
          if (candidate !== null) {
            candidates.push(candidate);
          }
        }

        queue.push({ node: childValue, key: lowerKey });
      }
    }
  }

  return pickBestCandidate(candidates);
}

function parseJsonSafe(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractPriceFromJsonLd(html: string, source: MarketplaceSource): number | null {
  const $ = load(html);
  const scripts = $('script[type="application/ld+json"]');

  for (const script of scripts.toArray()) {
    const raw = $(script).contents().text().trim();
    if (!raw) continue;
    const parsed = parseJsonSafe(raw);
    if (!parsed) continue;

    const price = collectPriceFromJson(parsed, source);
    if (price !== null) {
      return price;
    }
  }

  return null;
}

function extractPriceFromKnownSelectors(html: string, source: MarketplaceSource): number | null {
  const $ = load(html);
  const selectors = source === "tokopedia" ? TOKOPEDIA_PRICE_SELECTORS : SHOPEE_PRICE_SELECTORS;

  // Selector spesifik diprioritaskan karena biasanya menunjuk harga produk final di PDP.
  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    if (!text) continue;
    const price = parsePriceFromText(text, source);
    if (price !== null) {
      return price;
    }
  }

  return null;
}

function extractPriceFromNextData(html: string, source: MarketplaceSource): number | null {
  const $ = load(html);
  const raw = $("#__NEXT_DATA__").first().contents().text().trim();
  if (!raw) return null;

  const parsed = parseJsonSafe(raw);
  if (!parsed) return null;

  return collectPriceFromJson(parsed, source);
}

function extractPriceFromScriptRegex(html: string, source: MarketplaceSource): number | null {
  // Regex fallback untuk embedded state yang tidak valid JSON tapi tetap memuat key harga.
  const regex =
    /"(?:harga|price|price_min|price_max|price_before_discount|price_min_before_discount|price_max_before_discount|final_price|current_price)"\s*:\s*"?(\d{4,15})"?/gi;

  const candidates: number[] = [];
  for (const match of html.matchAll(regex)) {
    const rawValue = match[1] ?? "";
    const price = parsePriceFromText(rawValue, source);
    if (price !== null) {
      candidates.push(price);
    }
    if (candidates.length >= 30) break;
  }

  return pickBestCandidate(candidates);
}

function extractPriceFromCurrencyRegex(html: string, source: MarketplaceSource): number | null {
  // Regex currency sengaja longgar sebagai fallback terakhir saat selector/JSON berubah.
  const regex = /(?:rp|idr)\s*[0-9][0-9.,\s]{2,}/gi;
  const candidates: number[] = [];

  for (const match of html.matchAll(regex)) {
    const text = match[0] ?? "";
    const price = parsePriceFromText(text, source);
    if (price !== null) {
      candidates.push(price);
    }
    if (candidates.length >= 30) break;
  }

  return pickBestCandidate(candidates);
}

async function fetchPageHtml(url: string): Promise<{ html: string | null; error?: string }> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": pickUserAgent(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      return {
        html: null,
        error: `Marketplace returned status ${response.status}.`,
      };
    }

    const html = await response.text();
    if (!html.trim()) {
      return { html: null, error: "Marketplace returned an empty response body." };
    }

    return { html };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fetch error.";
    return { html: null, error: `Failed to fetch marketplace page: ${message}` };
  }
}

function detectBlockedPage(html: string): boolean {
  const lowered = html.toLowerCase();
  return lowered.includes("access denied") || lowered.includes("captcha");
}

function parseMarketplaceHtml(html: string, source: MarketplaceSource): number | null {
  const parserSteps = [
    () => extractPriceFromJsonLd(html, source),
    () => extractPriceFromNextData(html, source),
    () => extractPriceFromKnownSelectors(html, source),
    () => extractPriceFromScriptRegex(html, source),
    () => extractPriceFromCurrencyRegex(html, source),
  ];

  for (const parseStep of parserSteps) {
    const price = parseStep();
    if (price !== null) return price;
  }

  return null;
}

async function scrapeBySource(url: string, source: "tokopedia" | "shopee"): Promise<MarketplaceScrapeResult> {
  const page = await fetchPageHtml(url);
  if (!page.html) {
    return {
      success: false,
      price: null,
      source,
      error: page.error ?? `Failed to fetch ${source} page.`,
    };
  }

  if (detectBlockedPage(page.html)) {
    return {
      success: false,
      price: null,
      source,
      error: `${source} page appears to be blocked by anti-bot protection.`,
    };
  }

  const price = parseMarketplaceHtml(page.html, source);
  if (price === null) {
    return {
      success: false,
      price: null,
      source,
      error: PRICE_PARSE_FALLBACK_MESSAGE,
    };
  }

  return {
    success: true,
    price,
    source,
  };
}

export async function scrapeMarketplacePrice(url: string): Promise<MarketplaceScrapeResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      success: false,
      price: null,
      source: "unknown",
      error: "URL marketplace tidak valid.",
    };
  }

  const source = detectSource(parsed.hostname);
  if (source === "unknown") {
    return {
      success: false,
      price: null,
      source,
      error: "URL marketplace belum didukung. Gunakan URL Shopee atau Tokopedia.",
    };
  }

  return scrapeBySource(parsed.toString(), source);
}
