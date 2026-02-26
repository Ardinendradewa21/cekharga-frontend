"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/server/auth/admin";
import {
  listBrands,
  listMarketplaces,
  type BrandListItem,
  type MarketplaceListItem,
} from "@/server/repositories/product-repository";
import { createSlug } from "@/server/utils/slug";

type ActionResult<T> = {
  success: boolean;
  message: string;
  data?: T;
};

type MasterDataFormInput = {
  id?: number;
  name: string;
  slug?: string;
  logo?: string | null;
};

const createSchema = z.object({
  name: z.string().trim().min(2).max(255),
  slug: z.string().trim().max(255).optional(),
  logo: z.string().trim().max(255).optional().nullable(),
});

const updateSchema = createSchema.extend({
  id: z.number().int().positive(),
});

const deleteSchema = z.object({
  id: z.number().int().positive(),
});

function normalizeSlug(name: string, slug?: string): string {
  const generated = createSlug(slug?.trim() || name.trim());
  if (!generated) {
    throw new Error("Slug tidak valid.");
  }
  return generated;
}

function normalizeLogo(logo: string | null | undefined): string | null {
  const cleaned = logo?.trim() ?? "";
  return cleaned ? cleaned : null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

async function requireAdminOrFail() {
  const session = await requireAdminSession();
  if (!session?.user) {
    throw new Error("Unauthorized admin.");
  }
}

function revalidateAdminMasterData() {
  revalidatePath("/admin");
  revalidatePath("/admin/produk");
  revalidatePath("/admin/produk/baru");
  revalidatePath("/admin/master-data/brands");
  revalidatePath("/admin/master-data/marketplaces");
}

function mapBrand(row: {
  id: bigint;
  nama_brand: string;
  slug: string;
  logo: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}): BrandListItem {
  return {
    id: Number(row.id),
    nama_brand: row.nama_brand,
    slug: row.slug,
    logo: row.logo,
    created_at: row.created_at ? row.created_at.toISOString() : null,
    updated_at: row.updated_at ? row.updated_at.toISOString() : null,
  };
}

function mapMarketplace(row: {
  id: bigint;
  nama: string;
  slug: string;
  logo: string | null;
  warna_hex: string;
  text_color: string;
  created_at: Date | null;
  updated_at: Date | null;
}): MarketplaceListItem {
  return {
    id: Number(row.id),
    nama: row.nama,
    slug: row.slug,
    logo: row.logo,
    warna_hex: row.warna_hex,
    text_color: row.text_color,
    created_at: row.created_at ? row.created_at.toISOString() : null,
    updated_at: row.updated_at ? row.updated_at.toISOString() : null,
  };
}

export async function listBrandsMasterDataAction(): Promise<ActionResult<BrandListItem[]>> {
  try {
    await requireAdminOrFail();
    const data = await listBrands();
    return { success: true, message: "Data brand berhasil diambil.", data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengambil data brand.";
    return { success: false, message };
  }
}

export async function createBrandMasterDataAction(
  input: MasterDataFormInput,
): Promise<ActionResult<BrandListItem>> {
  try {
    await requireAdminOrFail();
    const parsed = createSchema.parse(input);

    const payload = {
      nama_brand: parsed.name.trim(),
      slug: normalizeSlug(parsed.name, parsed.slug),
      logo: normalizeLogo(parsed.logo ?? null),
      created_at: new Date(),
      updated_at: new Date(),
    };

    const duplicate = await prisma.brand.findFirst({
      where: {
        OR: [
          { slug: payload.slug },
          { nama_brand: { equals: payload.nama_brand, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });

    if (duplicate) {
      return { success: false, message: "Brand dengan nama/slug tersebut sudah ada." };
    }

    const created = await prisma.brand.create({ data: payload });
    revalidateAdminMasterData();
    return {
      success: true,
      message: "Brand berhasil dibuat.",
      data: mapBrand(created),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat brand.";
    if (isUniqueConstraintError(error)) {
      return { success: false, message: "Brand dengan nama/slug tersebut sudah ada." };
    }
    return { success: false, message };
  }
}

export async function updateBrandMasterDataAction(
  input: MasterDataFormInput,
): Promise<ActionResult<BrandListItem>> {
  try {
    await requireAdminOrFail();
    const parsed = updateSchema.parse(input);

    const payload = {
      nama_brand: parsed.name.trim(),
      slug: normalizeSlug(parsed.name, parsed.slug),
      logo: normalizeLogo(parsed.logo ?? null),
      updated_at: new Date(),
    };

    const duplicate = await prisma.brand.findFirst({
      where: {
        id: { not: BigInt(parsed.id) },
        OR: [
          { slug: payload.slug },
          { nama_brand: { equals: payload.nama_brand, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });

    if (duplicate) {
      return { success: false, message: "Brand dengan nama/slug tersebut sudah ada." };
    }

    const updated = await prisma.brand.update({
      where: { id: BigInt(parsed.id) },
      data: payload,
    });

    revalidateAdminMasterData();
    return {
      success: true,
      message: "Brand berhasil diperbarui.",
      data: mapBrand(updated),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui brand.";
    if (isUniqueConstraintError(error)) {
      return { success: false, message: "Brand dengan nama/slug tersebut sudah ada." };
    }
    if (isNotFoundError(error)) {
      return { success: false, message: "Brand tidak ditemukan." };
    }
    return { success: false, message };
  }
}

export async function deleteBrandMasterDataAction(
  input: { id: number },
): Promise<ActionResult<{ id: number }>> {
  try {
    await requireAdminOrFail();
    const parsed = deleteSchema.parse(input);
    const targetId = BigInt(parsed.id);

    const usageCount = await prisma.product.count({
      where: { id_brand: targetId },
    });

    if (usageCount > 0) {
      return {
        success: false,
        message: `Brand masih dipakai oleh ${usageCount} produk. Lepaskan relasinya terlebih dahulu.`,
      };
    }

    await prisma.brand.delete({
      where: { id: targetId },
    });

    revalidateAdminMasterData();
    return {
      success: true,
      message: "Brand berhasil dihapus.",
      data: { id: parsed.id },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus brand.";
    if (isNotFoundError(error)) {
      return { success: false, message: "Brand tidak ditemukan." };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return {
        success: false,
        message: "Brand masih terhubung dengan data lain dan tidak bisa dihapus.",
      };
    }
    return { success: false, message };
  }
}

export async function listMarketplacesMasterDataAction(): Promise<ActionResult<MarketplaceListItem[]>> {
  try {
    await requireAdminOrFail();
    const data = await listMarketplaces();
    return { success: true, message: "Data marketplace berhasil diambil.", data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengambil data marketplace.";
    return { success: false, message };
  }
}

export async function createMarketplaceMasterDataAction(
  input: MasterDataFormInput,
): Promise<ActionResult<MarketplaceListItem>> {
  try {
    await requireAdminOrFail();
    const parsed = createSchema.parse(input);

    const payload = {
      nama: parsed.name.trim(),
      slug: normalizeSlug(parsed.name, parsed.slug),
      logo: normalizeLogo(parsed.logo ?? null),
      warna_hex: "#000000",
      text_color: "#ffffff",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const duplicate = await prisma.marketplace.findFirst({
      where: {
        OR: [
          { slug: payload.slug },
          { nama: { equals: payload.nama, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });

    if (duplicate) {
      return { success: false, message: "Marketplace dengan nama/slug tersebut sudah ada." };
    }

    const created = await prisma.marketplace.create({ data: payload });
    revalidateAdminMasterData();
    return {
      success: true,
      message: "Marketplace berhasil dibuat.",
      data: mapMarketplace(created),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat marketplace.";
    if (isUniqueConstraintError(error)) {
      return { success: false, message: "Marketplace dengan nama/slug tersebut sudah ada." };
    }
    return { success: false, message };
  }
}

export async function updateMarketplaceMasterDataAction(
  input: MasterDataFormInput,
): Promise<ActionResult<MarketplaceListItem>> {
  try {
    await requireAdminOrFail();
    const parsed = updateSchema.parse(input);

    const payload = {
      nama: parsed.name.trim(),
      slug: normalizeSlug(parsed.name, parsed.slug),
      logo: normalizeLogo(parsed.logo ?? null),
      updated_at: new Date(),
    };

    const duplicate = await prisma.marketplace.findFirst({
      where: {
        id: { not: BigInt(parsed.id) },
        OR: [
          { slug: payload.slug },
          { nama: { equals: payload.nama, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });

    if (duplicate) {
      return { success: false, message: "Marketplace dengan nama/slug tersebut sudah ada." };
    }

    const updated = await prisma.marketplace.update({
      where: { id: BigInt(parsed.id) },
      data: payload,
    });

    revalidateAdminMasterData();
    return {
      success: true,
      message: "Marketplace berhasil diperbarui.",
      data: mapMarketplace(updated),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui marketplace.";
    if (isUniqueConstraintError(error)) {
      return { success: false, message: "Marketplace dengan nama/slug tersebut sudah ada." };
    }
    if (isNotFoundError(error)) {
      return { success: false, message: "Marketplace tidak ditemukan." };
    }
    return { success: false, message };
  }
}

export async function deleteMarketplaceMasterDataAction(
  input: { id: number },
): Promise<ActionResult<{ id: number }>> {
  try {
    await requireAdminOrFail();
    const parsed = deleteSchema.parse(input);
    const targetId = BigInt(parsed.id);

    const [legacyUsageCount, variantPriceUsageCount] = await Promise.all([
      prisma.marketplaceLink.count({
        where: { marketplace_id: targetId },
      }),
      prisma.productPrice.count({
        where: { marketplace_id: targetId },
      }),
    ]);
    const usageCount = legacyUsageCount + variantPriceUsageCount;

    if (usageCount > 0) {
      return {
        success: false,
        message: `Marketplace masih dipakai oleh ${usageCount} data harga/link produk. Lepaskan relasinya terlebih dahulu.`,
      };
    }

    await prisma.marketplace.delete({
      where: { id: targetId },
    });

    revalidateAdminMasterData();
    return {
      success: true,
      message: "Marketplace berhasil dihapus.",
      data: { id: parsed.id },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus marketplace.";
    if (isNotFoundError(error)) {
      return { success: false, message: "Marketplace tidak ditemukan." };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return {
        success: false,
        message: "Marketplace masih terhubung dengan data lain dan tidak bisa dihapus.",
      };
    }
    return { success: false, message };
  }
}
