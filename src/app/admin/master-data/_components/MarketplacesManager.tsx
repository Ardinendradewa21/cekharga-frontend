"use client";

import { useMemo, useState } from "react";

import {
  createMarketplaceMasterDataAction,
  deleteMarketplaceMasterDataAction,
  updateMarketplaceMasterDataAction,
} from "@/server/actions/master-data-actions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { MasterDataFormSheet } from "./MasterDataFormSheet";

type MarketplaceRow = {
  id: number;
  nama: string;
  slug: string;
  logo: string | null;
};

type MarketplacesManagerProps = {
  initialItems: MarketplaceRow[];
  initialError?: string | null;
};

type Notice = {
  type: "success" | "error";
  message: string;
};

function sortMarketplaces(items: MarketplaceRow[]) {
  return [...items].sort((a, b) =>
    a.nama.localeCompare(b.nama, "id", { sensitivity: "base" }),
  );
}

function toPreviewUrl(value: string | null | undefined) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const clean = value.startsWith("/") ? value.slice(1) : value;
  return `/${clean}`;
}

export function MarketplacesManager({
  initialItems,
  initialError,
}: MarketplacesManagerProps) {
  const [items, setItems] = useState<MarketplaceRow[]>(sortMarketplaces(initialItems));
  const [notice, setNotice] = useState<Notice | null>(
    initialError ? { type: "error", message: initialError } : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetRenderKey, setSheetRenderKey] = useState(0);
  const [editingItem, setEditingItem] = useState<MarketplaceRow | null>(null);

  const headerTitle = useMemo(
    () => (editingItem ? "Edit Marketplace" : "Tambah Marketplace Baru"),
    [editingItem],
  );

  const headerDescription = useMemo(
    () =>
      editingItem
        ? "Perbarui data marketplace pada master data."
        : "Tambahkan marketplace ke master data agar bisa dipakai ulang pada form produk.",
    [editingItem],
  );

  function showNotice(type: Notice["type"], message: string) {
    setNotice({ type, message });
  }

  function openCreateSheet() {
    setEditingItem(null);
    setSheetRenderKey((current) => current + 1);
    setIsSheetOpen(true);
  }

  function openEditSheet(item: MarketplaceRow) {
    setEditingItem(item);
    setSheetRenderKey((current) => current + 1);
    setIsSheetOpen(true);
  }

  async function handleSubmit(values: { name: string; slug: string; logo: string }) {
    setIsSubmitting(true);
    try {
      const response = editingItem
        ? await updateMarketplaceMasterDataAction({
            id: editingItem.id,
            name: values.name,
            slug: values.slug,
            logo: values.logo || null,
          })
        : await createMarketplaceMasterDataAction({
            name: values.name,
            slug: values.slug,
            logo: values.logo || null,
          });

      if (!response.success || !response.data) {
        showNotice("error", response.message || "Gagal menyimpan marketplace.");
        return;
      }

      const normalized: MarketplaceRow = {
        id: response.data.id,
        nama: response.data.nama,
        slug: response.data.slug,
        logo: response.data.logo,
      };

      setItems((current) => {
        const exists = current.some((item) => item.id === normalized.id);
        const next = exists
          ? current.map((item) => (item.id === normalized.id ? normalized : item))
          : [...current, normalized];
        return sortMarketplaces(next);
      });

      setIsSheetOpen(false);
      setEditingItem(null);
      showNotice("success", response.message || "Marketplace berhasil disimpan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(item: MarketplaceRow) {
    const confirmed = window.confirm(
      `Hapus marketplace "${item.nama}"? Data tidak bisa dikembalikan.`,
    );
    if (!confirmed) return;

    setIsDeletingId(item.id);
    try {
      const response = await deleteMarketplaceMasterDataAction({ id: item.id });
      if (!response.success) {
        showNotice("error", response.message || "Gagal menghapus marketplace.");
        return;
      }

      setItems((current) => current.filter((target) => target.id !== item.id));
      showNotice("success", response.message || "Marketplace berhasil dihapus.");
    } finally {
      setIsDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Master Data Marketplaces</h1>
          <p className="text-sm text-slate-500">
            Kelola marketplace agar dropdown produk selalu konsisten dan logo tidak perlu upload berulang.
          </p>
        </div>
        <Button type="button" onClick={openCreateSheet}>
          Add New
        </Button>
      </div>

      {notice ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            notice.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Logo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const preview = toPreviewUrl(item.logo);
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={preview}
                        alt={`Logo ${item.nama}`}
                        className="h-9 w-9 rounded-md border object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-slate-800">{item.nama}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">{item.slug}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => openEditSheet(item)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleDelete(item)}
                        disabled={isDeletingId === item.id}
                      >
                        {isDeletingId === item.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-slate-500">
                  Belum ada marketplace.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <MasterDataFormSheet
        key={sheetRenderKey}
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) setEditingItem(null);
        }}
        title={headerTitle}
        description={headerDescription}
        submitLabel={editingItem ? "Update Marketplace" : "Create Marketplace"}
        bucket="marketplaces"
        isSubmitting={isSubmitting}
        initialValues={
          editingItem
            ? {
                name: editingItem.nama,
                slug: editingItem.slug,
                logo: editingItem.logo ?? "",
              }
            : undefined
        }
        onSubmit={handleSubmit}
      />
    </div>
  );
}
