"use client";

import { useState } from "react";
import { Loader2, WandSparkles } from "lucide-react";

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

  async function handleFetchSpecs() {
    if (!url.trim()) {
      setFeedback("URL GSMArena wajib diisi.");
      return;
    }

    setIsLoading(true);
    setFeedback("");

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

      let appliedCount = 0;
      for (const [name, value] of Object.entries(json.data.fields)) {
        if (value === null || value === undefined) continue;

        const field = form.elements.namedItem(name);
        if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) {
          continue;
        }

        applyFieldValue(field, value, overwrite);
        appliedCount += 1;
      }

      setFeedback(`Autofill selesai. ${appliedCount} field diperbarui.`);
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
        Link akan diparsing otomatis, lalu field produk dan spesifikasi diisi agar tinggal revisi manual.
      </p>

      {feedback ? <p className="mt-2 text-xs text-slate-700">{feedback}</p> : null}
    </div>
  );
}
