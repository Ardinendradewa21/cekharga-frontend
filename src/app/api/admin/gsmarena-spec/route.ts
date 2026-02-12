import { z } from "zod";

import { jsonError, jsonSuccess } from "@/server/api/response";
import { requireAdminSession } from "@/server/auth/admin";
import { parseGsmarenaHtml } from "@/server/scraper/gsmarena";

export const runtime = "nodejs";

const requestSchema = z.object({
  url: z.string().trim().url(),
});

function isAllowedGsmarenaUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname === "www.gsmarena.com" || parsed.hostname === "gsmarena.com";
  } catch {
    return false;
  }
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
      return jsonError(parsed.error.issues[0]?.message ?? "URL GSMArena tidak valid.", 400);
    }

    if (!isAllowedGsmarenaUrl(parsed.data.url)) {
      return jsonError("URL harus berasal dari gsmarena.com.", 400);
    }

    const upstream = await fetch(parsed.data.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return jsonError("Halaman GSMArena tidak bisa diakses.", 400);
    }

    const html = await upstream.text();
    const parsedSpecs = parseGsmarenaHtml(html);

    return jsonSuccess(parsedSpecs, "Data GSMArena berhasil diambil.");
  } catch {
    return jsonError("Terjadi error saat memproses URL GSMArena.", 500);
  }
}
