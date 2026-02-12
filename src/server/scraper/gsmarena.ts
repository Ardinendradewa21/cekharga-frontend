import { createSlug } from "@/server/utils/slug";

type ParsedGsmarenaResult = {
  fields: Record<string, string | number | boolean | null>;
};

const HTML_ENTITY_MAP: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&deg;": " deg",
  "&micro;": "u",
};

function decodeHtml(value: string): string {
  let output = value;
  for (const [entity, replacement] of Object.entries(HTML_ENTITY_MAP)) {
    output = output.replaceAll(entity, replacement);
  }

  output = output.replace(/&#(\d+);/g, (_match, code: string) => {
    const parsed = Number(code);
    return Number.isFinite(parsed) ? String.fromCharCode(parsed) : "";
  });

  return output;
}

function normalizeText(value: string): string {
  return decodeHtml(
    value
      .replace(/<br\s*\/?>/gi, "; ")
      .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function buildDataSpecMap(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const regex = /<(?:td|th)[^>]*class="nfo"[^>]*data-spec="([^"]+)"[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;

  for (const match of html.matchAll(regex)) {
    const key = match[1]?.trim().toLowerCase();
    const rawValue = match[2] ?? "";
    if (!key || map.has(key)) continue;

    const value = normalizeText(rawValue);
    if (value) {
      map.set(key, value);
    }
  }

  return map;
}

function buildLabelMap(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const labelRegex = /<(?:td|th)[^>]*class="ttl"[^>]*>([\s\S]*?)<\/(?:td|th)>/i;
  const valueRegex = /<(?:td|th)[^>]*class="nfo"[^>]*>([\s\S]*?)<\/(?:td|th)>/i;

  for (const row of html.matchAll(rowRegex)) {
    const segment = row[1] ?? "";
    const labelMatch = segment.match(labelRegex);
    const valueMatch = segment.match(valueRegex);

    const label = normalizeText(labelMatch?.[1] ?? "").toLowerCase();
    const value = normalizeText(valueMatch?.[1] ?? "");

    if (!label || !value || label === "&nbsp;") continue;
    if (!map.has(label)) {
      map.set(label, value);
    }
  }

  return map;
}

function firstValue(
  dataSpecMap: Map<string, string>,
  labelMap: Map<string, string>,
  options: { specs?: string[]; labels?: string[] },
) {
  for (const key of options.specs ?? []) {
    const hit = dataSpecMap.get(key.toLowerCase());
    if (hit) return hit;
  }

  for (const label of options.labels ?? []) {
    const hit = labelMap.get(label.toLowerCase());
    if (hit) return hit;
  }

  return null;
}

function extractModelName(html: string): string | null {
  const match = html.match(/data-spec="modelname"[^>]*>([\s\S]*?)<\/h1>/i);
  const value = normalizeText(match?.[1] ?? "");
  return value || null;
}

function parseMegaPixel(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(\d+(?:\.\d+)?)\s*MP/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed);
}

function parseBatteryCapacity(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(\d{3,5})\s*mAh/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseScreenSize(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(\d+(?:\.\d+)?)\s*inches/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseReleaseDate(statusOrYear: string | null): { tanggalRilis: string | null; tahunRilis: number | null } {
  if (!statusOrYear) return { tanggalRilis: null, tahunRilis: null };

  const cleaned = statusOrYear.replace(/\./g, " ");
  const explicitDateMatch = cleaned.match(/((?:19|20)\d{2}\s*,\s*[A-Za-z]+\s*\d{1,2})/i);
  const monthYearMatch = cleaned.match(/((?:19|20)\d{2}\s*,\s*[A-Za-z]+)/i);
  const yearMatch = cleaned.match(/((?:19|20)\d{2})/);

  let isoDate: string | null = null;
  if (explicitDateMatch?.[1]) {
    const parsed = new Date(explicitDateMatch[1]);
    if (!Number.isNaN(parsed.getTime())) {
      isoDate = parsed.toISOString().slice(0, 10);
    }
  } else if (monthYearMatch?.[1]) {
    const parsed = new Date(`${monthYearMatch[1]}, 01`);
    if (!Number.isNaN(parsed.getTime())) {
      isoDate = parsed.toISOString().slice(0, 10);
    }
  }

  const year = yearMatch?.[1] ? Number(yearMatch[1]) : null;
  return {
    tanggalRilis: isoDate,
    tahunRilis: year && Number.isFinite(year) ? year : null,
  };
}

function parseBooleanByText(value: string | null): boolean | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized.includes("yes")) return true;
  if (normalized.includes("no")) return false;
  return null;
}

function extractIpRating(...values: Array<string | null>): string | null {
  for (const value of values) {
    if (!value) continue;
    const match = value.match(/IP\d{2}[A-Z]*/i);
    if (match?.[0]) return match[0].toUpperCase();
  }
  return null;
}

export function parseGsmarenaHtml(html: string): ParsedGsmarenaResult {
  const dataSpecMap = buildDataSpecMap(html);
  const labelMap = buildLabelMap(html);

  const modelName = extractModelName(html);
  const network = firstValue(dataSpecMap, labelMap, { specs: ["nettech"], labels: ["technology"] });
  const status = firstValue(dataSpecMap, labelMap, { specs: ["status", "year"], labels: ["status", "announced"] });
  const dimensions = firstValue(dataSpecMap, labelMap, { specs: ["dimensions"], labels: ["dimensions"] });
  const weight = firstValue(dataSpecMap, labelMap, { specs: ["weight"], labels: ["weight"] });
  const bodyOther = firstValue(dataSpecMap, labelMap, { specs: ["bodyother", "build"], labels: ["build"] });
  const displayType = firstValue(dataSpecMap, labelMap, { specs: ["displaytype"], labels: ["type"] });
  const displaySize = firstValue(dataSpecMap, labelMap, { specs: ["displaysize"], labels: ["size"] });
  const displayResolution = firstValue(dataSpecMap, labelMap, { specs: ["displayresolution"], labels: ["resolution"] });
  const displayProtection = firstValue(dataSpecMap, labelMap, {
    specs: ["displayprotection"],
    labels: ["protection"],
  });
  const os = firstValue(dataSpecMap, labelMap, { specs: ["os", "platformos"], labels: ["os"] });
  const chipset = firstValue(dataSpecMap, labelMap, { specs: ["chipset", "platformchipset"], labels: ["chipset"] });
  const memorySlot = firstValue(dataSpecMap, labelMap, { specs: ["memoryslot"], labels: ["card slot"] });
  const internalMemory = firstValue(dataSpecMap, labelMap, { specs: ["internalmemory"], labels: ["internal"] });
  const camMain = firstValue(dataSpecMap, labelMap, {
    specs: ["cam1modules"],
    labels: ["single", "dual", "triple", "quad"],
  });
  const camMainVideo = firstValue(dataSpecMap, labelMap, { specs: ["cam1video"], labels: ["video"] });
  const camSelfie = firstValue(dataSpecMap, labelMap, {
    specs: ["cam2modules"],
    labels: ["single", "dual"],
  });
  const camSelfieVideo = firstValue(dataSpecMap, labelMap, { specs: ["cam2video"], labels: ["video"] });
  const wlan = firstValue(dataSpecMap, labelMap, { specs: ["wlan"], labels: ["wlan"] });
  const bluetooth = firstValue(dataSpecMap, labelMap, { specs: ["bluetooth"], labels: ["bluetooth"] });
  const gps = firstValue(dataSpecMap, labelMap, { specs: ["gps"], labels: ["positioning", "gps"] });
  const usb = firstValue(dataSpecMap, labelMap, { specs: ["usb"], labels: ["usb"] });
  const nfc = firstValue(dataSpecMap, labelMap, { specs: ["nfc"], labels: ["nfc"] });
  const sensors = firstValue(dataSpecMap, labelMap, { specs: ["sensors"], labels: ["sensors"] });
  const loudspeaker = firstValue(dataSpecMap, labelMap, { specs: ["loudspeaker"], labels: ["loudspeaker"] });
  const jack35 = firstValue(dataSpecMap, labelMap, { specs: ["audiojack"], labels: ["3.5mm jack"] });
  const battery = firstValue(dataSpecMap, labelMap, { specs: ["batdescription1", "battype-hl"], labels: ["type"] });
  const charging = firstValue(dataSpecMap, labelMap, { specs: ["charging", "battype-hl"], labels: ["charging"] });
  const { tanggalRilis, tahunRilis } = parseReleaseDate(status);
  const slotMemory = parseBooleanByText(memorySlot);
  const hasNfc = parseBooleanByText(nfc);
  const hasAudioJack = parseBooleanByText(jack35);
  const modelSlug = modelName ? createSlug(modelName) : null;

  return {
    fields: {
      nama_produk: modelName,
      slug: modelSlug,
      teknologi_jaringan: network,
      tanggal_rilis: tanggalRilis,
      tahun_rilis: tahunRilis,
      dimensi: dimensions,
      berat: weight,
      rating_ip: extractIpRating(bodyOther, dimensions),
      tipe_layar: displayType,
      ukuran_layar: parseScreenSize(displaySize),
      resolusi: displayResolution,
      proteksi_layar: displayProtection,
      os,
      chipset,
      ada_slot_memori: slotMemory ?? false,
      varian_internal: internalMemory,
      kamera_utama_mp: parseMegaPixel(camMain),
      detail_kamera_utama: camMain,
      kamera_utama_video: camMainVideo,
      kamera_selfie_mp: parseMegaPixel(camSelfie),
      detail_kamera_selfie: camSelfie,
      kamera_selfie_video: camSelfieVideo,
      ada_nfc: hasNfc ?? false,
      ada_jack_audio: hasAudioJack ?? false,
      kapasitas_baterai: parseBatteryCapacity(battery),
      kecepatan_cas: charging,
      sensor: sensors,
      sound_loudspeaker: loudspeaker,
      sound_jack: jack35,
      comms_wlan: wlan,
      comms_bluetooth: bluetooth,
      comms_gps: gps,
      comms_usb: usb,
    },
  };
}

