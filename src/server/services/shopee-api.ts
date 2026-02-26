import { createHmac } from "node:crypto";

const DEFAULT_SHOPEE_API_BASE_URL = "https://partner.shopeemobile.com";
// Jika endpoint affiliate akun Anda berbeda, override via env SHOPEE_ITEM_INFO_PATH.
const DEFAULT_SHOPEE_ITEM_INFO_PATH = "/api/v2/product/get_item_base_info";
const SHOPEE_REQUEST_TIMEOUT_MS = 15_000;

export type ShopeeExtractedIds = {
  shopId: number;
  itemId: number;
};

export type ShopeeProductInfoResult = {
  success: boolean;
  price: number;
  name: string;
  error?: string;
  statusCode?: number;
};

type ShopeeApiErrorCode = string | number | null | undefined;

interface ShopeePriceInfo {
  current_price?: number | null;
  original_price?: number | null;
  inflated_price_of_current_price?: number | null;
  inflated_price_of_original_price?: number | null;
  price?: number | null;
}

interface ShopeeVariation {
  price?: number | null;
  current_price?: number | null;
  price_info?: ShopeePriceInfo[] | null;
}

interface ShopeeItemBaseInfo {
  item_id: number;
  item_name: string;
  price?: number | null;
  current_price?: number | null;
  price_info?: ShopeePriceInfo[] | null;
  variation_list?: ShopeeVariation[] | null;
}

interface ShopeeItemBaseInfoPayload {
  item_list?: ShopeeItemBaseInfo[] | null;
  item?: ShopeeItemBaseInfo | null;
}

interface ShopeeItemBaseInfoApiResponse {
  error?: ShopeeApiErrorCode;
  message?: string;
  request_id?: string;
  warning?: string;
  response?: ShopeeItemBaseInfoPayload | null;
}

function cleanEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function isSuccessfulShopeeErrorCode(errorCode: ShopeeApiErrorCode): boolean {
  if (errorCode === null || errorCode === undefined) return true;
  const normalized = String(errorCode).trim().toLowerCase();
  return normalized === "" || normalized === "0" || normalized === "ok";
}

function parseJsonSafely(text: string): ShopeeItemBaseInfoApiResponse | null {
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as ShopeeItemBaseInfoApiResponse;
  } catch {
    return null;
  }
}

function normalizePriceNumber(rawValue: number): number | null {
  if (!Number.isFinite(rawValue) || rawValue <= 0) return null;

  let value = Math.trunc(rawValue);

  // Shopee sering mengembalikan angka harga skala tertentu.
  if (value >= 100_000_000_000 && value % 100_000 === 0) {
    value = Math.trunc(value / 100_000);
  } else if (value >= 100_000_000 && value % 100 === 0) {
    value = Math.trunc(value / 100);
  }

  return value > 0 ? value : null;
}

function parsePriceCandidate(value: unknown): number | null {
  if (typeof value === "number") {
    return normalizePriceNumber(value);
  }

  if (typeof value === "string") {
    const digits = value.replace(/[^\d]/g, "");
    if (!digits) return null;
    return normalizePriceNumber(Number(digits));
  }

  return null;
}

function pickBestPrice(candidates: number[]): number | null {
  const valid = candidates.filter((value) => Number.isFinite(value) && value > 0);
  if (valid.length === 0) return null;
  return Math.min(...valid);
}

function collectPriceCandidates(item: ShopeeItemBaseInfo): number[] {
  const candidates: number[] = [];

  const pushCandidate = (value: unknown) => {
    const parsed = parsePriceCandidate(value);
    if (parsed !== null) {
      candidates.push(parsed);
    }
  };

  pushCandidate(item.current_price);
  pushCandidate(item.price);

  for (const priceInfo of item.price_info ?? []) {
    pushCandidate(priceInfo.inflated_price_of_current_price);
    pushCandidate(priceInfo.current_price);
    pushCandidate(priceInfo.price);
    pushCandidate(priceInfo.original_price);
    pushCandidate(priceInfo.inflated_price_of_original_price);
  }

  for (const variation of item.variation_list ?? []) {
    pushCandidate(variation.current_price);
    pushCandidate(variation.price);

    for (const variationPriceInfo of variation.price_info ?? []) {
      pushCandidate(variationPriceInfo.inflated_price_of_current_price);
      pushCandidate(variationPriceInfo.current_price);
      pushCandidate(variationPriceInfo.price);
      pushCandidate(variationPriceInfo.original_price);
      pushCandidate(variationPriceInfo.inflated_price_of_original_price);
    }
  }

  return candidates;
}

function pickItemFromResponse(response: ShopeeItemBaseInfoApiResponse): ShopeeItemBaseInfo | null {
  const payload = response.response;
  if (!payload) return null;

  if (payload.item_list && payload.item_list.length > 0) {
    return payload.item_list[0] ?? null;
  }

  return payload.item ?? null;
}

function buildShopeeEndpoint(path: string, query: URLSearchParams): string {
  const baseUrl = cleanEnv("SHOPEE_API_BASE_URL") || DEFAULT_SHOPEE_API_BASE_URL;
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}?${query.toString()}`;
}

export function extractShopeeIds(url: string): ShopeeExtractedIds | null {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  if (!parsedUrl.hostname.toLowerCase().includes("shopee")) {
    return null;
  }

  const target = `${parsedUrl.pathname}${parsedUrl.search}`;
  const patterns = [
    // Format umum: /nama-produk-i.<shop_id>.<item_id>
    /-i\.(\d+)\.(\d+)(?:[/?#]|$)/i,
    // Format lain: /product/<shop_id>/<item_id>
    /\/product\/(\d+)\/(\d+)(?:[/?#]|$)/i,
    // Fallback generic jika segmen -i.<shop>.<item> berada di posisi berbeda.
    /i\.(\d+)\.(\d+)(?:[/?#]|$)/i,
  ];

  for (const pattern of patterns) {
    const match = target.match(pattern);
    if (!match) continue;

    const shopId = Number(match[1]);
    const itemId = Number(match[2]);

    if (!Number.isFinite(shopId) || !Number.isFinite(itemId)) {
      continue;
    }

    return {
      shopId,
      itemId,
    };
  }

  return null;
}

export function generateShopeeSignature(path: string, timestamp: number): string {
  const appId = cleanEnv("SHOPEE_APP_ID");
  const appSecret = cleanEnv("SHOPEE_APP_SECRET");

  if (!appId || !appSecret) {
    throw new Error("Shopee credential belum dikonfigurasi (SHOPEE_APP_ID/SHOPEE_APP_SECRET).");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseString = `${appId}${normalizedPath}${timestamp}`;

  return createHmac("sha256", appSecret).update(baseString).digest("hex");
}

export async function fetchShopeeProductInfo(url: string): Promise<ShopeeProductInfoResult> {
  const extractedIds = extractShopeeIds(url);
  if (!extractedIds) {
    return {
      success: false,
      price: 0,
      name: "",
      error: "Format URL Shopee tidak valid. Gunakan URL produk standar Shopee.",
      statusCode: 400,
    };
  }

  const appId = cleanEnv("SHOPEE_APP_ID");
  const appSecret = cleanEnv("SHOPEE_APP_SECRET");
  if (!appId || !appSecret) {
    return {
      success: false,
      price: 0,
      name: "",
      error: "Konfigurasi Shopee API belum lengkap di environment.",
      statusCode: 500,
    };
  }

  const path = cleanEnv("SHOPEE_ITEM_INFO_PATH") || DEFAULT_SHOPEE_ITEM_INFO_PATH;
  const timestamp = Math.floor(Date.now() / 1000);

  let signature = "";
  try {
    signature = generateShopeeSignature(path, timestamp);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat signature Shopee.";
    return {
      success: false,
      price: 0,
      name: "",
      error: message,
      statusCode: 500,
    };
  }

  const query = new URLSearchParams({
    partner_id: appId,
    timestamp: String(timestamp),
    sign: signature,
    shop_id: String(extractedIds.shopId),
    item_id_list: String(extractedIds.itemId),
    item_id: String(extractedIds.itemId),
  });

  // Beberapa akun/endpoint affiliate membutuhkan access token tambahan.
  const accessToken = cleanEnv("SHOPEE_ACCESS_TOKEN");
  if (accessToken) {
    query.set("access_token", accessToken);
  }

  const endpoint = buildShopeeEndpoint(path, query);

  try {
    const upstream = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(SHOPEE_REQUEST_TIMEOUT_MS),
    });

    const rawBody = await upstream.text();
    const parsedBody = parseJsonSafely(rawBody);

    if (upstream.status === 429) {
      return {
        success: false,
        price: 0,
        name: "",
        error: "Shopee API rate limit tercapai. Coba lagi beberapa saat.",
        statusCode: 429,
      };
    }

    if (!upstream.ok) {
      return {
        success: false,
        price: 0,
        name: "",
        error:
          parsedBody?.message?.trim() ||
          `Shopee API mengembalikan status ${upstream.status}.`,
        statusCode: upstream.status >= 400 && upstream.status < 600 ? upstream.status : 500,
      };
    }

    if (!parsedBody) {
      return {
        success: false,
        price: 0,
        name: "",
        error: "Respons Shopee API tidak valid (bukan JSON).",
        statusCode: 502,
      };
    }

    if (!isSuccessfulShopeeErrorCode(parsedBody.error)) {
      return {
        success: false,
        price: 0,
        name: "",
        error: parsedBody.message?.trim() || "Shopee API mengembalikan error.",
        statusCode: 502,
      };
    }

    const item = pickItemFromResponse(parsedBody);
    if (!item) {
      return {
        success: false,
        price: 0,
        name: "",
        error: "Produk Shopee tidak ditemukan pada respons API.",
        statusCode: 404,
      };
    }

    const priceCandidates = collectPriceCandidates(item);
    const bestPrice = pickBestPrice(priceCandidates);
    if (!bestPrice) {
      return {
        success: false,
        price: 0,
        name: item.item_name?.trim() || "",
        error: "Harga produk tidak ditemukan pada respons Shopee API.",
        statusCode: 422,
      };
    }

    return {
      success: true,
      price: bestPrice,
      name: item.item_name?.trim() || "",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fetch error.";
    return {
      success: false,
      price: 0,
      name: "",
      error: `Gagal menghubungi Shopee API: ${message}`,
      statusCode: 502,
    };
  }
}
