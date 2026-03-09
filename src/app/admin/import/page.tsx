"use client";

import { useRef, useState } from "react";
import { Download, FileText, Loader2, SkipForward, CheckCircle2, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ImportRowResult = {
  row: number;
  nama_produk: string;
  status: "ok" | "skip" | "error";
  message: string;
};

type ImportResponse = {
  success: boolean;
  message: string;
  data?: {
    results: ImportRowResult[];
    summary: { ok: number; error: number; skip: number };
  };
};

const statusIcon = {
  ok: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />,
  skip: <SkipForward className="h-4 w-4 shrink-0 text-amber-500" />,
  error: <XCircle className="h-4 w-4 shrink-0 text-red-500" />,
};

const statusColor = {
  ok: "bg-emerald-50 border-emerald-100",
  skip: "bg-amber-50 border-amber-100",
  error: "bg-red-50 border-red-100",
};

// ─── Section 1: Generate CSV dari brand page GSMArena ──────────────────────

function GsmarenaGeneratorSection() {
  const [brandUrl, setBrandUrl] = useState("");
  const [brandSlug, setBrandSlug] = useState("");
  const [status, setStatus] = useState<"draft" | "aktif">("draft");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!brandUrl.trim() || !brandSlug.trim() || isLoading) return;
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/gsmarena-brand-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandUrl: brandUrl.trim(), brandSlug: brandSlug.trim(), status }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { message?: string };
        setError(json.message ?? `Error ${res.status}`);
        return;
      }

      // Trigger download CSV
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${brandSlug}-gsmarena.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Gagal menghubungi server.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-5 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-violet-800">
        Generate CSV Otomatis dari GSMArena
      </h2>
      <p className="mb-4 text-xs text-violet-700">
        Masukkan URL halaman brand di GSMArena (contoh: samsung-phones-9.php), sistem akan mengambil daftar
        HP-nya dan menghasilkan file CSV siap import.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="gsmarena_brand_url" className="text-xs">URL Brand GSMArena</Label>
          <Input
            id="gsmarena_brand_url"
            type="url"
            value={brandUrl}
            onChange={(e) => setBrandUrl(e.target.value)}
            placeholder="https://www.gsmarena.com/samsung-phones-9.php"
            className="text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="gsmarena_brand_slug" className="text-xs">Brand Slug (sesuai database)</Label>
          <Input
            id="gsmarena_brand_slug"
            type="text"
            value={brandSlug}
            onChange={(e) => setBrandSlug(e.target.value)}
            placeholder="samsung"
            className="text-sm"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm">
        <span className="text-slate-600">Status produk:</span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name="gen_status" checked={status === "draft"} onChange={() => setStatus("draft")} />
          draft
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name="gen_status" checked={status === "aktif"} onChange={() => setStatus("aktif")} />
          aktif
        </label>
      </div>

      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}

      <div className="mt-4">
        <Button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={!brandUrl.trim() || !brandSlug.trim() || isLoading}
          variant="outline"
          className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-100"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isLoading ? "Mengambil data..." : "Download CSV"}
        </Button>
      </div>

      <p className="mt-3 text-xs text-violet-600">
        Cara pakai: Buka <strong>gsmarena.com</strong>, pilih brand, copy URL halaman brand tersebut
        (misal <em>https://www.gsmarena.com/samsung-phones-9.php</em>), lalu download CSV-nya.
        Setelah dapat file CSV, upload di bagian bawah.
      </p>
    </div>
  );
}

// ─── Section 2: Upload & Import CSV ────────────────────────────────────────

function CsvUploadSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ImportResponse | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResponse(null);
  }

  async function handleImport() {
    if (!file || isLoading) return;
    setIsLoading(true);
    setResponse(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/import-csv", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as ImportResponse;
      setResponse(json);
    } catch {
      setResponse({ success: false, message: "Gagal menghubungi server." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-700">Upload & Import CSV</h2>
      <div
        onClick={() => fileRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center transition-colors hover:border-violet-400 hover:bg-violet-50/30"
      >
        <FileText className="h-10 w-10 text-slate-300" />
        <div>
          <p className="text-sm font-semibold text-slate-700">
            {file ? file.name : "Klik untuk pilih file CSV"}
          </p>
          <p className="text-xs text-slate-500">Format: .csv · Maksimal 100 baris</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button
          type="button"
          onClick={() => void handleImport()}
          disabled={!file || isLoading}
          className="gap-2"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {isLoading ? "Memproses..." : "Mulai Import"}
        </Button>
        {file && !isLoading && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setFile(null);
              setResponse(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
          >
            Batal
          </Button>
        )}
      </div>

      {response && (
        <div className="mt-5">
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${
              response.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {response.message}
          </div>

          {response.data && (
            <>
              <div className="mb-4 flex gap-4 text-sm">
                <span className="font-semibold text-emerald-700">{response.data.summary.ok} berhasil</span>
                <span className="font-semibold text-amber-600">{response.data.summary.skip} dilewati</span>
                <span className="font-semibold text-red-600">{response.data.summary.error} error</span>
              </div>
              <div className="space-y-2">
                {response.data.results.map((r) => (
                  <div
                    key={`${r.row}-${r.nama_produk}`}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${statusColor[r.status]}`}
                  >
                    {statusIcon[r.status]}
                    <div>
                      <span className="font-medium text-slate-800">{r.nama_produk}</span>
                      <span className="ml-2 text-slate-500">— {r.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-linear-to-r from-white via-slate-50 to-violet-50 p-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Import Produk via CSV</h1>
        <p className="mt-1 text-sm text-slate-600">
          Generate daftar HP dari GSMArena secara otomatis, lalu import ke database sekaligus.
        </p>
      </div>

      {/* Format panduan */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">Format CSV</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700">
          <div>nama_produk,brand_slug,gsmarena_url,status</div>
          <div>Samsung Galaxy A55 5G,samsung,https://www.gsmarena.com/samsung_galaxy_a55_5g-12560.php,draft</div>
          <div>Xiaomi 14T Pro,xiaomi,https://www.gsmarena.com/xiaomi_14t_pro-12561.php,draft</div>
          <div>Realme C75,realme,,draft</div>
        </div>
        <ul className="mt-3 space-y-1 text-xs text-slate-600">
          <li><span className="font-semibold">nama_produk</span> — wajib. Nama lengkap HP.</li>
          <li><span className="font-semibold">brand_slug</span> — wajib. Harus cocok dengan slug brand di database (contoh: samsung, xiaomi, oppo).</li>
          <li><span className="font-semibold">gsmarena_url</span> — opsional. Jika diisi, spesifikasi diambil otomatis dari GSMArena saat import.</li>
          <li><span className="font-semibold">status</span> — opsional. Default: draft.</li>
          <li>Maksimal 100 baris per file.</li>
        </ul>
      </div>

      <GsmarenaGeneratorSection />
      <CsvUploadSection />
    </div>
  );
}
