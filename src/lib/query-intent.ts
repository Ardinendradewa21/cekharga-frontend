/**
 * Query Intent Parser
 *
 * Mengubah natural language query dari user menjadi structured filter.
 * Contoh: "hp gaming murah buat main genshin impact 3 jutaan"
 *   → { useCase: "gaming", sort: "termurah", maxPrice: 4_500_000, remainingQuery: "genshin impact", hasIntent: true }
 *
 * Ini adalah rule-based NLP — tidak butuh API eksternal, zero latency, deterministic.
 */

export type ParsedIntent = {
  useCase?: "gaming" | "camera" | "battery" | "daily";
  sort?: "termurah" | "termahal" | "antutu";
  maxPrice?: number;
  hasNfc?: true;
  remainingQuery: string;
  hasIntent: boolean;
};

// ---------------------------------------------------------------------------
// Keyword banks
// ---------------------------------------------------------------------------

const GAMING_KEYWORDS = [
  // Nama game spesifik (panjang dulu supaya tidak dipotong oleh substring)
  "genshin impact",
  "mobile legends",
  "mobile legend",
  "wuthering waves",
  "honkai star rail",
  "honkai impact",
  "league of legends",
  "wild rift",
  "arena of valor",
  "tower of fantasy",
  "diablo immortal",
  "eternal return",
  "last shelter",
  "last day on earth",
  "rise of kingdoms",
  "state of survival",
  "black desert",
  "clash of clans",
  "clash royale",
  "dragon raja",
  "call of duty",
  "ragnarok",
  "free fire",
  "warhammer",
  "nikke",
  "roblox",
  "minecraft",
  "pubg mobile",
  "pubg",
  "codm",
  "mlbb",
  "ml",
  // Istilah gaming umum
  "game berat",
  "game ringan",
  "game online",
  "grafis tinggi",
  "high graphics",
  "gaming",
  "game",
  "ngegame",
  "mabar",
  "gamers",
  "gamer",
  "fps tinggi",
  "lag free",
  "anti lag",
  "smooth gaming",
];

const CAMERA_KEYWORDS = [
  "kamera bagus",
  "kamera terbaik",
  "kamera jernih",
  "foto bagus",
  "foto terbaik",
  "foto jernih",
  "foto malam",
  "night mode",
  "night photography",
  "content creator",
  "konten kreator",
  "low light",
  "fotografi",
  "fotografer",
  "videografi",
  "cinematic",
  "ultrawide",
  "telephoto",
  "periskop",
  "zoom jauh",
  "kamera",
  "camera",
  "vlogging",
  "vlogger",
  "youtuber",
  "tiktok",
  "instagram",
  "vlog",
  "bokeh",
  "portrait",
  "potret",
  "selfie",
  "foto",
  "ig",
];

const BATTERY_KEYWORDS = [
  "baterai tahan lama",
  "baterai awet",
  "baterai besar",
  "baterai gede",
  "baterai tidak boros",
  "anti boros",
  "tidak ngedrop",
  "awet baterai",
  "tahan lama",
  "kerja lapangan",
  "outdoor",
  "travel",
  "battery life",
  "baterai",
  "battery",
  "ngedrop",
  "awet",
  "daya tahan",
];

const DAILY_KEYWORDS = [
  "kerja kantoran",
  "untuk kerja",
  "buat kerja",
  "sehari-hari",
  "sehari hari",
  "pemakaian sehari",
  "kantoran",
  "office",
  "kantor",
  "kerja",
  "kuliah",
  "pelajar",
  "mahasiswa",
  "siswa",
  "anak sekolah",
  "pelajaran",
  "zoom meeting",
  "meeting online",
  "harian",
];

// NFC intent — tidak masuk ke use case, tapi set filter hasNfc
const NFC_KEYWORDS = [
  "nfc",
  "tap to pay",
  "bayar tap",
  "e-money",
  "e money",
  "kartu e-money",
  "flazz",
  "brizzi",
  "emoney",
  "jakcard",
  "commuter",
];

const CHEAP_KEYWORDS = [
  "paling murah",
  "harga murah",
  "murah meriah",
  "budget ketat",
  "terjangkau",
  "hemat",
  "budget",
  "murah",
  "ekonomis",
];

const PREMIUM_KEYWORDS = [
  "flagship terbaik",
  "paling mahal",
  "harga mahal",
  "high end",
  "high-end",
  "kelas atas",
  "premium",
  "flagship",
  "terbaik",
  "mewah",
];

const PERFORMANCE_KEYWORDS = [
  "performa terbaik",
  "performa tinggi",
  "paling kencang",
  "paling ngebut",
  "snapdragon terkini",
  "dimensity terkini",
  "antutu tinggi",
  "benchmark tinggi",
  "antutu",
  "benchmark",
  "processor kuat",
  "prosesor kuat",
  "kencang",
  "ngebut",
  "performa",
];

// Filler words yang dihapus dari remaining query
const FILLER_WORDS = [
  "handphone",
  "smartphone",
  "ponsel",
  "telepon",
  "untuk",
  "buat",
  "dengan",
  "yang",
  "bisa",
  "cari",
  "mau",
  "minta",
  "ingin",
  "tolong",
  "rekomendasi",
  "rekomen",
  "suggest",
  "terbaik",
  "bagus",
  "paling",
  "sangat",
  "banget",
  "sekali",
  "juga",
  "serta",
  "atau",
  "dan",
  "tapi",
  "harga",
  "kisaran",
  "sekitar",
  "dibawah",
  "di bawah",
  "diatas",
  "di atas",
  "hp",
];

// Pre-sort all keyword arrays (longest first) once at module load so findKeyword/stripKeywords skip re-sorting every call.
for (const arr of [GAMING_KEYWORDS, CAMERA_KEYWORDS, BATTERY_KEYWORDS, DAILY_KEYWORDS, NFC_KEYWORDS, CHEAP_KEYWORDS, PREMIUM_KEYWORDS, PERFORMANCE_KEYWORDS, FILLER_WORDS]) {
  arr.sort((a, b) => b.length - a.length);
}

// ---------------------------------------------------------------------------
// Price extraction
// ---------------------------------------------------------------------------

/**
 * Mengekstrak batas harga dari query teks bebas.
 *
 * Pattern yang dikenali:
 *   "3 juta"      → maxPrice = 3_000_000  (exact)
 *   "3 jutaan"    → maxPrice = 4_500_000  (±50% wiggle)
 *   "3.5 juta"    → maxPrice = 3_500_000
 *   "2,5 juta"    → maxPrice = 2_500_000
 *   "500 ribu"    → maxPrice = 500_000
 *   "500rb"       → maxPrice = 500_000
 *   "500k"        → maxPrice = 500_000
 *   "1.5jt"       → maxPrice = 1_500_000
 *   "di bawah 2jt"→ maxPrice = 2_000_000
 */
function extractPrice(query: string): { maxPrice: number | undefined; cleaned: string } {
  let cleaned = query;
  let maxPrice: number | undefined;

  // Regex: angka (dengan titik/koma desimal) diikuti satuan juta/jt/ribu/rb/k
  // Prefix opsional: "dibawah", "di bawah", "kurang dari", "maksimal", "max"
  const priceRegex =
    /(?:(?:di\s*bawah|kurang\s*dari|maksimal|max|under)\s+)?(\d+(?:[.,]\d+)?)\s*(jutaan|juta|jt|ribu|rb|k)\b/gi;

  const match = priceRegex.exec(cleaned);
  if (match) {
    const raw = match[1].replace(",", "."); // normalisasi koma jadi titik
    const num = parseFloat(raw);
    const unit = match[2].toLowerCase();

    if (unit === "jutaan") {
      // "3 jutaan" → orang biasanya maksud harga di kisaran itu, tambah ~50%
      maxPrice = Math.round(num * 1_000_000 * 1.5);
    } else if (unit === "juta" || unit === "jt") {
      maxPrice = Math.round(num * 1_000_000);
    } else {
      // ribu, rb, k
      maxPrice = Math.round(num * 1_000);
    }

    cleaned = cleaned.replace(match[0], " ").trim();
  }

  return { maxPrice, cleaned };
}

// ---------------------------------------------------------------------------
// Keyword matching helper
// ---------------------------------------------------------------------------

/**
 * Cek apakah query mengandung salah satu keyword dari list.
 * Match berbasis word-boundary-ish (diawali/diakhiri non-alphanumeric atau awal/akhir string).
 * Kembalikan keyword yang match (untuk keperluan stripping), atau null.
 */
function findKeyword(query: string, keywords: string[]): string | null {
  for (const kw of keywords) {
    // Escape untuk regex
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i");
    if (re.test(query)) return kw;
  }
  return null;
}

/**
 * Hapus semua kemunculan keywords dari query.
 */
function stripKeywords(query: string, keywords: string[]): string {
  let result = query;
  for (const kw of keywords) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "gi");
    result = result.replace(re, " ");
  }
  return result.replace(/\s{2,}/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Parse natural language query menjadi structured intent + remaining FTS query.
 *
 * @param rawQuery - string yang diketik user di search bar
 * @returns ParsedIntent
 */
export function parseQueryIntent(rawQuery: string): ParsedIntent {
  if (!rawQuery || !rawQuery.trim()) {
    return { remainingQuery: "", hasIntent: false };
  }

  // Normalisasi: lowercase, trim
  let q = rawQuery.toLowerCase().trim();

  // 1. Ekstrak harga terlebih dahulu (supaya angka tidak mengganggu kata kunci lain)
  const { maxPrice, cleaned: qAfterPrice } = extractPrice(q);
  q = qAfterPrice;

  // 2. Deteksi use case
  let useCase: ParsedIntent["useCase"];
  let qAfterUseCase = q;

  const gamingMatch = findKeyword(q, GAMING_KEYWORDS);
  if (gamingMatch) {
    useCase = "gaming";
    qAfterUseCase = stripKeywords(q, GAMING_KEYWORDS);
  } else {
    const cameraMatch = findKeyword(q, CAMERA_KEYWORDS);
    if (cameraMatch) {
      useCase = "camera";
      qAfterUseCase = stripKeywords(q, CAMERA_KEYWORDS);
    } else {
      const batteryMatch = findKeyword(q, BATTERY_KEYWORDS);
      if (batteryMatch) {
        useCase = "battery";
        qAfterUseCase = stripKeywords(q, BATTERY_KEYWORDS);
      } else {
        const dailyMatch = findKeyword(q, DAILY_KEYWORDS);
        if (dailyMatch) {
          useCase = "daily";
          qAfterUseCase = stripKeywords(q, DAILY_KEYWORDS);
        }
      }
    }
  }

  q = qAfterUseCase;

  // 3. Deteksi sort intent
  let sort: ParsedIntent["sort"];

  if (findKeyword(q, PERFORMANCE_KEYWORDS)) {
    sort = "antutu";
    q = stripKeywords(q, PERFORMANCE_KEYWORDS);
  } else if (findKeyword(q, PREMIUM_KEYWORDS)) {
    sort = "termahal";
    q = stripKeywords(q, PREMIUM_KEYWORDS);
  } else if (findKeyword(q, CHEAP_KEYWORDS)) {
    sort = "termurah";
    q = stripKeywords(q, CHEAP_KEYWORDS);
  }

  // 4. Hapus filler words dari sisa query
  q = stripKeywords(q, FILLER_WORDS);

  // Bersihkan spasi ganda dan karakter punctuation yang tersisa di tepi
  const remainingQuery = q.replace(/[,.\-–—/\\]+/g, " ").replace(/\s{2,}/g, " ").trim();

  // 5. Deteksi NFC intent — strip keyword, set hasNfc
  let hasNfc: true | undefined;
  if (findKeyword(remainingQuery, NFC_KEYWORDS)) {
    hasNfc = true;
    // Strip dari remainingQuery juga
    const cleaned2 = stripKeywords(remainingQuery, NFC_KEYWORDS)
      .replace(/[,.\-–—/\\]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    return {
      ...(useCase ? { useCase } : {}),
      ...(sort ? { sort } : {}),
      ...(maxPrice !== undefined ? { maxPrice } : {}),
      hasNfc,
      remainingQuery: cleaned2,
      hasIntent: true,
    };
  }

  const hasIntent = !!(useCase ?? sort ?? maxPrice ?? hasNfc);

  return {
    ...(useCase ? { useCase } : {}),
    ...(sort ? { sort } : {}),
    ...(maxPrice !== undefined ? { maxPrice } : {}),
    remainingQuery,
    hasIntent,
  };
}
