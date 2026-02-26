"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { ImageUploadField } from "../../_components/ImageUploadField";

type MasterDataFormValues = {
  name: string;
  slug: string;
  logo: string;
};

type MasterDataFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  bucket: "brands" | "marketplaces";
  isSubmitting: boolean;
  initialValues?: Partial<MasterDataFormValues>;
  onSubmit: (values: MasterDataFormValues) => Promise<void> | void;
};

function localSlugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]+/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function MasterDataFormSheet({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  bucket,
  isSubmitting,
  initialValues,
  onSubmit,
}: MasterDataFormSheetProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [slug, setSlug] = useState(initialValues?.slug ?? "");
  const [logo, setLogo] = useState(initialValues?.logo ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initialValues?.slug));

  function handleNameChange(nextValue: string) {
    setName(nextValue);
    if (!slugTouched) {
      setSlug(localSlugify(nextValue));
    }
  }

  function handleSlugChange(nextValue: string) {
    setSlug(nextValue);
    setSlugTouched(true);
  }

  function syncSlugFromName() {
    setSlug(localSlugify(name));
    setSlugTouched(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      name: name.trim(),
      slug: slug.trim(),
      logo: logo.trim(),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-xl overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="master_data_name">Nama</Label>
            <Input
              id="master_data_name"
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Masukkan nama"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="master_data_slug">Slug</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={syncSlugFromName}
                className="h-7 px-2 text-xs"
              >
                Sinkronkan dari Nama
              </Button>
            </div>
            <Input
              id="master_data_slug"
              value={slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              placeholder="slug-otomatis"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Logo</Label>
            <ImageUploadField
              name="master_data_logo_dummy"
              value={logo}
              onChange={setLogo}
              bucket={bucket}
              previewAlt="Preview logo"
              includeHiddenInput={false}
            />
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : submitLabel}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
