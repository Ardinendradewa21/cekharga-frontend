import { load } from "cheerio";
import { z } from "zod";

import { jsonError, jsonSuccess } from "@/server/api/response";
import { requireAdminSession } from "@/server/auth/admin";

export const runtime = "nodejs";

const requestSchema = z.object({
  q: z.string().trim().min(2, "Query minimal 2 karakter.").max(100),
});

type GsmarenaSearchResult = {
  name: string;
  url: string;
  img: string | null;
};

function parseSearchResults(html: string): GsmarenaSearchResult[] {
  const $ = load(html);
  const results: GsmarenaSearchResult[] = [];

  // GSMArena search results page: div.makers > ul > li > a
  $(".makers li a").each((_, el) => {
    if (results.length >= 10) return false;

    const href = $(el).attr("href") ?? "";
    // Slug format: "samsung_galaxy_a55_5g-12560.php"
    const slugMatch = href.match(/^([a-z0-9_-]+-\d+\.php)$/);
    if (!slugMatch?.[1]) return;

    const imgSrc = $(el).find("img").attr("src") ?? null;
    const name = $(el).find("strong span").first().text().trim();
    if (!name) return;

    const imgUrl = imgSrc
      ? imgSrc.startsWith("http")
        ? imgSrc
        : `https://www.gsmarena.com/${imgSrc}`
      : null;

    results.push({
      name,
      url: `https://www.gsmarena.com/${slugMatch[1]}`,
      img: imgUrl,
    });
  });

  return results;
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
      return jsonError(parsed.error.issues[0]?.message ?? "Query tidak valid.", 400);
    }

    const searchUrl = `https://www.gsmarena.com/search.php3?sName=${encodeURIComponent(parsed.data.q)}`;

    const upstream = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.gsmarena.com/",
        Cookie: "",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      return jsonError(`GSMArena tidak dapat diakses (status ${upstream.status}).`, 502);
    }

    const html = await upstream.text();

    // Deteksi jika halaman berisi CAPTCHA / access denied
    if (html.toLowerCase().includes("captcha") || html.toLowerCase().includes("access denied")) {
      return jsonError("GSMArena memblokir request. Coba masukkan URL GSMArena secara manual.", 503);
    }

    const results = parseSearchResults(html);

    return jsonSuccess(
      results,
      results.length > 0 ? `${results.length} hasil ditemukan.` : "Tidak ada hasil. Coba kata kunci lain atau masukkan URL GSMArena secara manual.",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return jsonError(`Gagal mencari di GSMArena: ${message}`, 500);
  }
}
