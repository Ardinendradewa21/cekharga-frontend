"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, RefreshCcw, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type ProductFormAssistantProps = {
  formId: string;
  draftKey: string;
};

type DraftPayload = {
  version: 1;
  savedAt: string;
  fields: Record<string, string | boolean>;
};

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getFormElements(form: HTMLFormElement) {
  return Array.from(
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input[name], textarea[name], select[name]"),
  );
}

function collectFormFields(form: HTMLFormElement): Record<string, string | boolean> {
  const fields: Record<string, string | boolean> = {};

  for (const element of getFormElements(form)) {
    const name = element.name?.trim();
    if (!name || element.disabled) continue;
    if (element instanceof HTMLInputElement && element.type === "file") continue;

    if (element instanceof HTMLInputElement && element.type === "radio") {
      if (element.checked) {
        fields[name] = element.value;
      }
      continue;
    }

    if (element instanceof HTMLInputElement && element.type === "checkbox") {
      fields[name] = element.checked;
      continue;
    }

    fields[name] = element.value;
  }

  return fields;
}

function applyFieldValue(
  field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string | boolean,
) {
  if (field instanceof HTMLInputElement && field.type === "checkbox") {
    field.checked = Boolean(value);
  } else if (typeof value === "string") {
    field.value = value;
  }

  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

function parseJsonArray<T>(raw: string): T[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function validateForm(form: HTMLFormElement): string[] {
  const formData = new FormData(form);
  const getText = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  };

  const issues: string[] = [];

  const namaProduk = getText("nama_produk");
  if (namaProduk.length < 2) issues.push("Nama produk minimal 2 karakter.");

  const slug = getText("slug");
  if (!slug) {
    issues.push("Slug wajib diisi.");
  } else if (!/^[a-z0-9-]+$/.test(slug)) {
    issues.push("Slug hanya boleh huruf kecil, angka, dan '-'.");
  }

  const idBrand = Number(getText("id_brand"));
  if (!Number.isFinite(idBrand) || idBrand <= 0) {
    issues.push("Brand wajib dipilih.");
  }

  const tahunRilisText = getText("tahun_rilis");
  if (tahunRilisText) {
    const tahunRilis = Number(tahunRilisText);
    if (!Number.isInteger(tahunRilis) || tahunRilis < 1990 || tahunRilis > 2100) {
      issues.push("Tahun rilis harus antara 1990-2100.");
    }
  }

  const hargaBaruText = getText("harga_terendah_baru");
  if (hargaBaruText && Number(hargaBaruText) < 0) {
    issues.push("Harga terendah baru tidak boleh negatif.");
  }

  const hargaBekasText = getText("harga_terendah_bekas");
  if (hargaBekasText && Number(hargaBekasText) < 0) {
    issues.push("Harga terendah bekas tidak boleh negatif.");
  }

  const rawLinks = parseJsonArray<{
    nama_marketplace?: string | null;
    nama_toko?: string | null;
    harga?: number | null;
    url_produk?: string | null;
    kondisi?: string | null;
    status_aktif?: boolean | null;
    marketplace_id?: number | null;
    marketplace_logo?: string | null;
  }>(getText("marketplace_links_json"));

  rawLinks.forEach((link, index) => {
    const hasAnyValue = Boolean(
      (link.nama_marketplace ?? "").trim() ||
        (link.nama_toko ?? "").trim() ||
        (link.harga !== null && link.harga !== undefined) ||
        (link.url_produk ?? "").trim(),
    );
    if (!hasAnyValue) return;

    const row = index + 1;
    if (!(link.nama_marketplace ?? "").trim()) {
      issues.push(`Marketplace link #${row}: nama marketplace wajib diisi.`);
    }

    if (typeof link.harga !== "number" || !Number.isFinite(link.harga) || link.harga < 0) {
      issues.push(`Marketplace link #${row}: harga harus angka >= 0.`);
    }

    if (!link.url_produk || !isHttpUrl(link.url_produk)) {
      issues.push(`Marketplace link #${row}: URL produk tidak valid.`);
    }
  });

  const rawReviews = parseJsonArray<{
    reviewer_name?: string | null;
    platform?: string | null;
    video_url?: string | null;
  }>(getText("reviews_json"));

  rawReviews.forEach((review, index) => {
    const hasAnyValue = Boolean((review.reviewer_name ?? "").trim() || (review.video_url ?? "").trim());
    if (!hasAnyValue) return;

    const row = index + 1;
    if (!(review.reviewer_name ?? "").trim()) {
      issues.push(`Review #${row}: nama reviewer wajib diisi.`);
    }
    if (!review.platform || !["youtube", "tiktok"].includes(review.platform)) {
      issues.push(`Review #${row}: platform harus youtube atau tiktok.`);
    }
    if (!review.video_url || !isHttpUrl(review.video_url)) {
      issues.push(`Review #${row}: URL video tidak valid.`);
    }
  });

  return issues;
}

export function ProductFormAssistant({ formId, draftKey }: ProductFormAssistantProps) {
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [statusText, setStatusText] = useState("Draft belum disimpan.");
  const [hasDraft, setHasDraft] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const validateTimerRef = useRef<number | null>(null);

  const issueCountLabel = useMemo(() => {
    if (validationIssues.length === 0) return "Input valid";
    return `${validationIssues.length} masalah terdeteksi`;
  }, [validationIssues]);

  const getForm = useCallback((): HTMLFormElement | null => {
    const form = document.getElementById(formId);
    return form instanceof HTMLFormElement ? form : null;
  }, [formId]);

  const saveDraft = useCallback(() => {
    const form = getForm();
    if (!form) return;

    const payload: DraftPayload = {
      version: 1,
      savedAt: new Date().toISOString(),
      fields: collectFormFields(form),
    };

    localStorage.setItem(draftKey, JSON.stringify(payload));
    setHasDraft(true);
    setStatusText(`Draft tersimpan otomatis (${new Date(payload.savedAt).toLocaleTimeString("id-ID")}).`);
  }, [draftKey, getForm]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveDraft();
    }, 700);
  }, [saveDraft]);

  const runValidation = useCallback(() => {
    const form = getForm();
    if (!form) return;
    setValidationIssues(validateForm(form));
  }, [getForm]);

  const scheduleValidation = useCallback(() => {
    if (validateTimerRef.current) {
      window.clearTimeout(validateTimerRef.current);
    }
    validateTimerRef.current = window.setTimeout(() => {
      runValidation();
    }, 300);
  }, [runValidation]);

  function restoreDraft() {
    const form = getForm();
    if (!form) return;

    const raw = localStorage.getItem(draftKey);
    if (!raw) {
      setStatusText("Draft tidak ditemukan.");
      setHasDraft(false);
      return;
    }

    let parsed: DraftPayload | null = null;
    try {
      parsed = JSON.parse(raw) as DraftPayload;
    } catch {
      parsed = null;
    }

    if (!parsed || !parsed.fields) {
      setStatusText("Draft rusak dan tidak bisa dipulihkan.");
      return;
    }

    for (const [name, value] of Object.entries(parsed.fields)) {
      const item = form.elements.namedItem(name);
      if (!item) continue;

      if (item instanceof RadioNodeList) {
        for (const node of Array.from(item)) {
          if (!(node instanceof HTMLInputElement)) continue;
          if (node.type === "radio") {
            node.checked = typeof value === "string" && node.value === value;
          } else {
            applyFieldValue(node, value);
          }
        }
        continue;
      }

      if (item instanceof HTMLInputElement || item instanceof HTMLTextAreaElement || item instanceof HTMLSelectElement) {
        applyFieldValue(item, value);
      }
    }

    setStatusText(`Draft dipulihkan (${new Date(parsed.savedAt).toLocaleString("id-ID")}).`);
    setHasDraft(true);
    window.setTimeout(() => {
      runValidation();
    }, 0);
  }

  function clearDraft() {
    localStorage.removeItem(draftKey);
    setHasDraft(false);
    setStatusText("Draft lokal dihapus.");
  }

  useEffect(() => {
    const form = getForm();
    if (!form) return;

    const hydrateTimer = window.setTimeout(() => {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;

      setHasDraft(true);
      try {
        const parsed = JSON.parse(raw) as DraftPayload;
        setStatusText(`Draft tersedia (${new Date(parsed.savedAt).toLocaleString("id-ID")}).`);
      } catch {
        setStatusText("Draft tersedia.");
      }
    }, 0);

    const validationInitTimer = window.setTimeout(() => {
      runValidation();
    }, 0);

    const onFieldChanged = () => {
      scheduleSave();
      scheduleValidation();
    };

    const onSubmit = (event: Event) => {
      const issues = validateForm(form);
      setValidationIssues(issues);
      if (issues.length > 0) {
        event.preventDefault();
        setStatusText("Submit dibatalkan. Perbaiki masalah pada validasi realtime.");
      }
    };

    const onBeforeUnload = () => saveDraft();

    form.addEventListener("input", onFieldChanged, true);
    form.addEventListener("change", onFieldChanged, true);
    form.addEventListener("submit", onSubmit);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.clearTimeout(hydrateTimer);
      window.clearTimeout(validationInitTimer);
      form.removeEventListener("input", onFieldChanged, true);
      form.removeEventListener("change", onFieldChanged, true);
      form.removeEventListener("submit", onSubmit);
      window.removeEventListener("beforeunload", onBeforeUnload);

      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (validateTimerRef.current) window.clearTimeout(validateTimerRef.current);
    };
  }, [draftKey, getForm, runValidation, saveDraft, scheduleSave, scheduleValidation]);

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Autosave Draft + Validasi Realtime</p>
          <p className="text-xs text-slate-600">{statusText}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={saveDraft}>
            <Save className="mr-1 h-4 w-4" />
            Simpan Draft
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={restoreDraft} disabled={!hasDraft}>
            <RefreshCcw className="mr-1 h-4 w-4" />
            Pulihkan Draft
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={clearDraft} disabled={!hasDraft}>
            <Trash2 className="mr-1 h-4 w-4" />
            Hapus Draft
          </Button>
        </div>
      </div>

      <div className={`mt-3 rounded-md border p-3 text-sm ${validationIssues.length ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
        <p className="flex items-center gap-2 font-medium text-slate-800">
          <AlertTriangle className="h-4 w-4" />
          {issueCountLabel}
        </p>
        {validationIssues.length > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
            {validationIssues.slice(0, 8).map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
            {validationIssues.length > 8 ? <li>+{validationIssues.length - 8} masalah lain.</li> : null}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-slate-700">Form siap disubmit.</p>
        )}
      </div>
    </section>
  );
}
