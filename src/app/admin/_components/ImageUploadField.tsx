"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type UploadResponse = {
  success: boolean;
  data?: {
    path: string;
    url: string;
  };
  message: string;
};

type ImageUploadFieldProps = {
  name: string;
  initialValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  bucket?: "hp" | "brands" | "marketplaces";
  previewAlt?: string;
  includeHiddenInput?: boolean;
};

function toPreviewUrl(value: string): string {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;

  const clean = value.startsWith("/") ? value.slice(1) : value;
  if (clean.startsWith("uploads/")) return `/${clean}`;
  if (clean.startsWith("storage/")) return `/${clean}`;
  return `/${clean}`;
}

export function ImageUploadField({
  name,
  initialValue = "",
  value,
  onChange,
  bucket = "hp",
  previewAlt = "Preview gambar",
  includeHiddenInput = true,
}: ImageUploadFieldProps) {
  const [internalPathValue, setInternalPathValue] = useState(initialValue);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState("");

  const pathValue = value ?? internalPathValue;
  const previewUrl = useMemo(() => toPreviewUrl(pathValue), [pathValue]);

  function applyValue(nextValue: string) {
    if (value === undefined) {
      setInternalPathValue(nextValue);
    }
    onChange?.(nextValue);
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFeedback("");

    const body = new FormData();
    body.append("file", file);
    body.append("bucket", bucket);

    try {
      const response = await fetch("/api/admin/upload-image", {
        method: "POST",
        body,
      });

      const json = (await response.json()) as UploadResponse;
      if (!response.ok || !json.success || !json.data?.path) {
        setFeedback(json.message || "Upload gagal.");
        setIsUploading(false);
        return;
      }

      applyValue(json.data.path);
      setFeedback("Upload berhasil.");
    } catch {
      setFeedback("Terjadi error saat upload.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {includeHiddenInput ? <input type="hidden" name={name} value={pathValue} /> : null}

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleUpload}
            disabled={isUploading}
          />
          {isUploading ? "Mengupload..." : "Upload Gambar"}
        </label>
        {pathValue ? (
          <Button type="button" variant="outline" size="sm" onClick={() => applyValue("")}>
            Hapus
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-slate-500">
        Path: <span className="font-mono">{pathValue || "-"}</span>
      </p>
      <p className="text-xs text-slate-500">Format: JPEG/PNG/WEBP, otomatis resize + kompres ke WEBP.</p>

      {feedback ? <p className="text-xs text-slate-600">{feedback}</p> : null}

      {previewUrl ? (
        <div className="overflow-hidden rounded-lg border bg-slate-50 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt={previewAlt} className="h-40 w-auto rounded object-contain" />
        </div>
      ) : null}
    </div>
  );
}
