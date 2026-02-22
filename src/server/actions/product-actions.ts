"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createProduct, deleteProduct, updateProduct } from "@/server/repositories/product-repository";
import { requireAdminSession } from "@/server/auth/admin";

import { parseProductFormData } from "./product-form-parser";

// Helper untuk membuat URL redirect yang sekaligus membawa flash message (?type=...&message=...).
function buildRedirectUrl(path: string, type: "success" | "error", message: string) {
  const params = new URLSearchParams({
    type,
    message,
  });
  return `${path}?${params.toString()}`;
}

// Next.js redirect melempar error internal.
// Helper ini dipakai supaya error redirect tidak dianggap error bisnis biasa.
function isNextRedirectError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (!("digest" in error)) return false;
  const digest = String((error as { digest?: unknown }).digest ?? "");
  return digest.startsWith("NEXT_REDIRECT");
}

export async function createProductAction(formData: FormData) {
  try {
    // 1) Pastikan user yang men-submit adalah admin.
    const session = await requireAdminSession();
    if (!session) {
      redirect(buildRedirectUrl("/admin/login", "error", "Silakan login sebagai admin."));
    }

    // 2) Ubah form mentah -> payload terstruktur, lalu simpan ke DB.
    const payload = parseProductFormData(formData);
    await createProduct(payload);

    // 3) Refresh cache halaman yang bergantung pada data produk.
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/produk");

    redirect(buildRedirectUrl("/admin/produk", "success", "Produk berhasil dibuat."));
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    // Error validasi/repository diarahkan kembali ke halaman form dengan pesan yang ramah.
    const message = error instanceof Error ? error.message : "Gagal membuat produk.";
    redirect(buildRedirectUrl("/admin/produk/baru", "error", message));
  }
}

export async function updateProductAction(productId: number, formData: FormData) {
  try {
    // Pola update sama: guard admin -> parse -> update -> revalidate -> redirect.
    const session = await requireAdminSession();
    if (!session) {
      redirect(buildRedirectUrl("/admin/login", "error", "Silakan login sebagai admin."));
    }

    const payload = parseProductFormData(formData);
    await updateProduct(productId, payload);

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/produk");
    revalidatePath(`/produk/${payload.slug}`);

    redirect(buildRedirectUrl("/admin/produk", "success", "Produk berhasil diperbarui."));
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Gagal memperbarui produk.";
    redirect(buildRedirectUrl(`/admin/produk/${productId}`, "error", message));
  }
}

export async function deleteProductAction(productId: number) {
  try {
    // Hanya admin yang boleh menghapus.
    const session = await requireAdminSession();
    if (!session) {
      redirect(buildRedirectUrl("/admin/login", "error", "Silakan login sebagai admin."));
    }

    await deleteProduct(productId);

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/produk");

    redirect(buildRedirectUrl("/admin/produk", "success", "Produk berhasil dihapus."));
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    // Gagal hapus tetap kembali ke list agar UX admin tidak buntu.
    redirect(buildRedirectUrl("/admin/produk", "error", "Gagal menghapus produk."));
  }
}
