"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createProduct, deleteProduct, updateProduct } from "@/server/repositories/product-repository";
import { requireAdminSession } from "@/server/auth/admin";

import { parseProductFormData } from "./product-form-parser";

function buildRedirectUrl(path: string, type: "success" | "error", message: string) {
  const params = new URLSearchParams({
    type,
    message,
  });
  return `${path}?${params.toString()}`;
}

function isNextRedirectError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (!("digest" in error)) return false;
  const digest = String((error as { digest?: unknown }).digest ?? "");
  return digest.startsWith("NEXT_REDIRECT");
}

export async function createProductAction(formData: FormData) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      redirect(buildRedirectUrl("/admin/login", "error", "Silakan login sebagai admin."));
    }

    const payload = parseProductFormData(formData);
    await createProduct(payload);

    revalidatePath("/");
    revalidatePath("/admin");

    redirect(buildRedirectUrl("/admin", "success", "Produk berhasil dibuat."));
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Gagal membuat produk.";
    redirect(buildRedirectUrl("/admin/produk/baru", "error", message));
  }
}

export async function updateProductAction(productId: number, formData: FormData) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      redirect(buildRedirectUrl("/admin/login", "error", "Silakan login sebagai admin."));
    }

    const payload = parseProductFormData(formData);
    await updateProduct(productId, payload);

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath(`/produk/${payload.slug}`);

    redirect(buildRedirectUrl("/admin", "success", "Produk berhasil diperbarui."));
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Gagal memperbarui produk.";
    redirect(buildRedirectUrl(`/admin/produk/${productId}`, "error", message));
  }
}

export async function deleteProductAction(productId: number) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      redirect(buildRedirectUrl("/admin/login", "error", "Silakan login sebagai admin."));
    }

    await deleteProduct(productId);

    revalidatePath("/");
    revalidatePath("/admin");

    redirect(buildRedirectUrl("/admin", "success", "Produk berhasil dihapus."));
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirect(buildRedirectUrl("/admin", "error", "Gagal menghapus produk."));
  }
}
