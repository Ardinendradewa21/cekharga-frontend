import { load } from "cheerio";
import { z } from "zod";

import { jsonError } from "@/server/api/response";
import { requireAdminSession } from "@/server/auth/admin";

export const runtime = "nodejs";
export const maxDuration = 30;

const requestSchema = z.object({
  brandUrl: z
    .string()
    .trim()
    .url()
    .refine((u) => /^https?:\/\/(www\.)?gsmarena\.com\/[a-z]+-phones-\d+\.php/.test(u), {
      message: 'URL harus berformat: https://www.gsmarena.com/samsung-phones-9.php',
    }),
  brandSlug: z.string().trim().min(1),
  status: z.enum(["aktif", "draft"]).default("draft"),
});

type PhoneEntry = {
  nama_produk: string;
  brand_slug: string;
  gsmarena_url: string;
  status: string;
};

function parsePhoneList(html: string, brandSlug: string, status: string): PhoneEntry[] {
  const $ = load(html);
  const phones: PhoneEntry[] = [];

  $(".makers li a").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const slugMatch = href.match(/^([a-z0-9_-]+-\d+\.php)$/);
    if (!slugMatch?.[1]) return;

    const name = $(el).find("strong span").first().text().trim();
    if (!name) return;

    phones.push({
      nama_produk: name,
      brand_slug: brandSlug,
      gsmarena_url: `https://www.gsmarena.com/${slugMatch[1]}`,
      status,
    });
  });

  return phones;
}

function escapeCsvField(val: string): string {
  if (/[",\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
  return val;
}

function toCsv(phones: PhoneEntry[]): string {
  const header = "nama_produk,brand_slug,gsmarena_url,status";
  const rows = phones.map(
    (p) =>
      [
        escapeCsvField(p.nama_produk),
        escapeCsvField(p.brand_slug),
        escapeCsvField(p.gsmarena_url),
        escapeCsvField(p.status),
      ].join(","),
  );
  return [header, ...rows].join("\n");
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session?.user) {
    return jsonError("Unauthorized admin.", 401);
  }

  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Parameter tidak valid.", 400);
    }

    const { brandUrl, brandSlug, status } = parsed.data;

    const upstream = await fetch(brandUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.gsmarena.com/",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!upstream.ok) {
      return jsonError(`GSMArena tidak dapat diakses (status ${upstream.status}).`, 502);
    }

    const html = await upstream.text();

    if (html.toLowerCase().includes("captcha") || html.toLowerCase().includes("access denied")) {
      return jsonError("GSMArena memblokir request saat ini. Coba beberapa menit lagi.", 503);
    }

    const phones = parsePhoneList(html, brandSlug, status);

    if (phones.length === 0) {
      return jsonError("Tidak ada produk yang ditemukan di halaman tersebut. Pastikan URL brand GSMArena benar.", 404);
    }

    const csv = toCsv(phones);
    const fileName = `${brandSlug}-gsmarena-${Date.now()}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return jsonError(`Gagal mengambil data brand: ${message}`, 500);
  }
}
