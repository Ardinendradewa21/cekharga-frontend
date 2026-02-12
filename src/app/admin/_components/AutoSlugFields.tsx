"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AutoSlugFieldsProps = {
  initialNamaProduk: string;
  initialSlug: string;
  autoGenerate: boolean;
};

function createSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function AutoSlugFields({
  initialNamaProduk,
  initialSlug,
  autoGenerate,
}: AutoSlugFieldsProps) {
  const derivedInitialSlug = useMemo(() => {
    if (initialSlug.trim()) return createSlug(initialSlug);
    return createSlug(initialNamaProduk);
  }, [initialNamaProduk, initialSlug]);

  const [namaProduk, setNamaProduk] = useState(initialNamaProduk);
  const [slug, setSlug] = useState(derivedInitialSlug);
  const [isSlugManual, setIsSlugManual] = useState(Boolean(initialSlug.trim() && initialSlug.trim() !== derivedInitialSlug));

  function handleNamaProdukChange(nextValue: string) {
    setNamaProduk(nextValue);

    if (autoGenerate && !isSlugManual) {
      setSlug(createSlug(nextValue));
    }
  }

  function handleSlugChange(nextValue: string) {
    setIsSlugManual(true);
    setSlug(createSlug(nextValue));
  }

  function handleResetSlug() {
    setSlug(createSlug(namaProduk));
    setIsSlugManual(false);
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="nama_produk">Nama Produk</Label>
        <Input
          id="nama_produk"
          name="nama_produk"
          value={namaProduk}
          onChange={(event) => handleNamaProdukChange(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="slug">Slug</Label>
          <button
            type="button"
            className="text-xs text-blue-600 hover:underline"
            onClick={handleResetSlug}
          >
            Sinkronkan dari Nama
          </button>
        </div>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={(event) => handleSlugChange(event.target.value)}
          required
        />
      </div>
    </>
  );
}
