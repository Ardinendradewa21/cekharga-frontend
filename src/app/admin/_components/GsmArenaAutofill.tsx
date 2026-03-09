"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, WandSparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GsmarenaResponse = {
  success: boolean;
  message: string;
  data?: {
    fields: Record<string, string | number | boolean | null>;
  };
};

type FetchImageUrlResponse = {
  success: boolean;
  message: string;
  data?: { path: string; url: string };
};

type GsmarenaSearchResult = {
  name: string;
  url: string;
  img: string | null;
};

type GsmarenaSearchResponse = {
  success: boolean;
  message: string;
  data?: GsmarenaSearchResult[];
};

type GsmArenaAutofillProps = {
  formId: string;
};

function applyFieldValue(
  field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string | number | boolean,
  overwriteFilled: boolean,
) {
  if (field instanceof HTMLInputElement && field.type === "checkbox") {
    if (typeof value !== "boolean") return;
    if (!overwriteFilled && field.checked) return;
    field.checked = value;
  } else {
    const nextValue = String(value);
    if (!overwriteFilled && field.value.trim()) return;
    field.value = nextValue;
  }

  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

export function GsmArenaAutofill({ formId }: GsmArenaAutofillProps) {
  const [url, setUrl] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GsmarenaSearchResult[]>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch("/api/admin/gsmarena-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: q.trim() }),
        });
        const json = (await res.json()) as GsmarenaSearchResponse;
        if (json.success && Array.isArray(json.data)) {
          setSearchResults(json.data);
        }
      } catch {
        // silent
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }

  function handleSelectResult(result: GsmarenaSearchResult) {
    setUrl(result.url);
    setSearchQuery(result.name);
    setSearchResults([]);
  }

  async function handleFetchSpecs() {
    if (!url.trim()) {
      setFeedback("URL GSMArena wajib diisi.");
      return;
    }

    setIsLoading(true);
    setFeedback("Mengambil spesifikasi...");

    try {
      const response = await fetch("/api/admin/gsmarena-spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = (await response.json()) as GsmarenaResponse;

      if (!response.ok || !json.success || !json.data) {
        setFeedback(json.message || "Gagal mengambil data GSMArena.");
        return;
      }

      const form = document.getElementById(formId) as HTMLFormElement | null;
      if (!form) {
        setFeedback("Form admin tidak ditemukan.");
        return;
      }

      // Pisahkan foto_gsmarena_url dari fields biasa — ini bukan field form HTML
      const { foto_gsmarena_url: fotoGsmarenaUrl, ...regularFields } = json.data.fields;

      let appliedCount = 0;
      for (const [name, value] of Object.entries(regularFields)) {
        if (value === null || value === undefined) continue;

        const field = form.elements.namedItem(name);
        if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) {
          continue;
        }

        applyFieldValue(field, value, overwrite);
        appliedCount += 1;
      }

      setFeedback(`Spesifikasi diisi (${appliedCount} field). ${typeof fotoGsmarenaUrl === "string" && fotoGsmarenaUrl ? "Mengunduh foto produk..." : "Foto tidak ditemukan di GSMArena."}`);

      // Auto-download foto jika ditemukan dan field foto masih kosong (atau overwrite aktif)
      if (typeof fotoGsmarenaUrl === "string" && fotoGsmarenaUrl) {
        const fotoField = form.elements.namedItem("foto") as HTMLInputElement | null;
        const fotoAlreadyFilled = fotoField?.value?.trim();

        if (!fotoAlreadyFilled || overwrite) {
          try {
            const imgResponse = await fetch("/api/admin/fetch-image-url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageUrl: fotoGsmarenaUrl, bucket: "hp" }),
            });
            const imgJson = (await imgResponse.json()) as FetchImageUrlResponse;

            if (imgResponse.ok && imgJson.success && imgJson.data?.path) {
              // Set hidden input foto (yang dipakai ImageUploadField sebagai value)
              if (fotoField) {
                fotoField.value = imgJson.data.path;
                fotoField.dispatchEvent(new Event("input", { bubbles: true }));
                fotoField.dispatchEvent(new Event("change", { bubbles: true }));
              }
              setFeedback(`Autofill selesai. ${appliedCount} field + foto produk berhasil diunduh.`);
            } else {
              setFeedback(`Autofill selesai. ${appliedCount} field diperbarui. Foto gagal diunduh: ${imgJson.message}`);
            }
          } catch {
            setFeedback(`Autofill selesai. ${appliedCount} field diperbarui. Foto gagal diunduh (error jaringan).`);
          }
        } else {
          setFeedback(`Autofill selesai. ${appliedCount} field diperbarui. Foto dilewati (sudah terisi).`);
        }
      } else {
        setFeedback(`Autofill selesai. ${appliedCount} field diperbarui.`);
      }
    } catch {
      setFeedback("Terjadi error saat menghubungi GSMArena.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-sky-900">
        <WandSparkles className="h-4 w-4" />
        Autofill dari GSMArena
      </div>

      {/* Search box */}
      <div className="mb-3 space-y-2">
        <Label htmlFor="gsmarena_search">Cari Nama HP</Label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            {isSearching
              ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              : <Search className="h-4 w-4 text-slate-400" />
            }
          </div>
          <Input
            id="gsmarena_search"
            type="text"
            value={searchQuery}
            onChange={(e) => void handleSearch(e.target.value)}
            onBlur={() => setTimeout(() => setSearchResults([]), 200)}
            placeholder="Samsung Galaxy A55, iPhone 15 Pro..."
            className="pl-9"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setSearchResults([]); }}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {searchResults.length > 0 && (
            <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              {searchResults.map((result) => (
                <button
                  key={result.url}
                  type="button"
                  onClick={() => handleSelectResult(result)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-sky-50"
                >
                  {result.img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={result.img} alt="" className="h-8 w-8 shrink-0 rounded object-contain" />
                  )}
                  <span className="font-medium text-slate-800">{result.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500">Ketik nama HP untuk mencari langsung di GSMArena. Pilih hasil untuk mengisi URL otomatis.</p>
      </div>

      {/* URL input + tombol fetch */}
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <Label htmlFor="gsmarena_url">URL GSMArena</Label>
          <Input
            id="gsmarena_url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.gsmarena.com/..."
          />
        </div>
        <div className="flex items-end">
          <Button type="button" onClick={handleFetchSpecs} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Ambil Spesifikasi
          </Button>
        </div>
      </div>

      <label className="mt-3 inline-flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} />
        Timpa field yang sudah terisi
      </label>

      <p className="mt-2 text-xs text-slate-600">
        Spesifikasi dan foto produk akan diisi otomatis. Foto diunduh langsung dari GSMArena dan disimpan ke server.
      </p>

      {feedback ? <p className="mt-2 text-xs font-medium text-sky-800">{feedback}</p> : null}
    </div>
  );
}
