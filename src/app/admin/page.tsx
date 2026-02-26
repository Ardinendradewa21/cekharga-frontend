import Link from "next/link";
import { Prisma, ProductStatus } from "@prisma/client";
import { Activity, Eye, type LucideIcon, Package, Tags } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

type MetricCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
};

function MetricCard({ label, value, icon: Icon }: MetricCardProps) {
  return (
    <Card className="border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}

function formatDate(date: Date | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function toCountNumber(value: number | bigint | null | undefined) {
  // Prisma aggregate untuk kolom BigInt bisa balik bigint.
  // Helper ini menyamakan semuanya jadi number untuk kebutuhan UI.
  if (value === null || value === undefined) return 0;
  return typeof value === "bigint" ? Number(value) : value;
}

function isUnknownViewsFieldError(error: unknown) {
  return error instanceof Prisma.PrismaClientValidationError && error.message.includes("Unknown field `views`");
}

type DashboardProductRow = {
  id: string;
  nama_produk: string;
  brand_name: string | null;
  views: number;
  created_at: Date | null;
};

type DashboardData = {
  totalProducts: number;
  totalBrands: number;
  totalViews: number;
  activeProducts: number;
  topViewedProducts: DashboardProductRow[];
  recentProducts: DashboardProductRow[];
};

type DashboardRawCountRow = {
  total: number | bigint;
};

type DashboardRawViewsRow = {
  total_views: number | bigint;
};

type DashboardRawProductRow = {
  id: number | bigint;
  nama_produk: string;
  brand_name: string | null;
  views: number | bigint;
  created_at: Date | null;
};

function isLegacyProdukTableNotFoundError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021" &&
    error.message.toLowerCase().includes("public.produk")
  );
}

function mapRawDashboardProducts(rows: DashboardRawProductRow[]): DashboardProductRow[] {
  return rows.map((product) => ({
    id: String(product.id),
    nama_produk: product.nama_produk,
    brand_name: product.brand_name,
    views: toCountNumber(product.views),
    created_at: product.created_at ?? null,
  }));
}

async function loadDashboardDataFromTableProductRaw(): Promise<DashboardData> {
  // Fallback aman saat Prisma Client lama masih menunjuk ke tabel `produk`.
  // Query ini langsung ke tabel aktual `table_product`.
  const [
    totalProductsRaw,
    totalBrandsRaw,
    totalViewsRaw,
    activeProductsRaw,
    topViewedProductsRaw,
    recentProductsRaw,
  ] = await Promise.all([
    prisma.$queryRaw<DashboardRawCountRow[]>`
      SELECT COUNT(*)::bigint AS total
      FROM "public"."table_product"
    `,
    prisma.$queryRaw<DashboardRawCountRow[]>`
      SELECT COUNT(*)::bigint AS total
      FROM "public"."brands"
    `,
    prisma.$queryRaw<DashboardRawViewsRow[]>`
      SELECT COALESCE(SUM("views"), 0)::bigint AS total_views
      FROM "public"."table_product"
    `,
    prisma.$queryRaw<DashboardRawCountRow[]>`
      SELECT COUNT(*)::bigint AS total
      FROM "public"."table_product"
      WHERE "status" = CAST('aktif' AS "public"."produk_status")
    `,
    prisma.$queryRaw<DashboardRawProductRow[]>`
      SELECT
        p."id",
        p."nama_produk",
        p."views"::bigint AS "views",
        p."created_at",
        b."nama_brand" AS "brand_name"
      FROM "public"."table_product" p
      LEFT JOIN "public"."brands" b ON b."id" = p."id_brand"
      ORDER BY p."views" DESC, p."created_at" DESC NULLS LAST
      LIMIT 5
    `,
    prisma.$queryRaw<DashboardRawProductRow[]>`
      SELECT
        p."id",
        p."nama_produk",
        p."views"::bigint AS "views",
        p."created_at",
        b."nama_brand" AS "brand_name"
      FROM "public"."table_product" p
      LEFT JOIN "public"."brands" b ON b."id" = p."id_brand"
      ORDER BY p."created_at" DESC NULLS LAST, p."id" DESC
      LIMIT 5
    `,
  ]);

  return {
    totalProducts: toCountNumber(totalProductsRaw[0]?.total),
    totalBrands: toCountNumber(totalBrandsRaw[0]?.total),
    totalViews: toCountNumber(totalViewsRaw[0]?.total_views),
    activeProducts: toCountNumber(activeProductsRaw[0]?.total),
    topViewedProducts: mapRawDashboardProducts(topViewedProductsRaw),
    recentProducts: mapRawDashboardProducts(recentProductsRaw),
  };
}

async function loadDashboardData(): Promise<DashboardData> {
  try {
    // Jalur utama: pakai kolom `views` baru.
    const [totalProducts, totalBrands, totalViewsAggregate, activeProducts, topViewedProductsRaw, recentProductsRaw] =
      await Promise.all([
        prisma.product.count(),
        prisma.brand.count(),
        prisma.product.aggregate({
          _sum: {
            views: true,
          },
        }),
        prisma.product.count({
          where: {
            status: ProductStatus.aktif,
          },
        }),
        prisma.product.findMany({
          take: 5,
          orderBy: [{ views: "desc" }, { created_at: "desc" }],
          select: {
            id: true,
            nama_produk: true,
            views: true,
            created_at: true,
            brand: {
              select: {
                nama_brand: true,
              },
            },
          },
        }),
        prisma.product.findMany({
          take: 5,
          orderBy: [{ created_at: "desc" }, { id: "desc" }],
          select: {
            id: true,
            nama_produk: true,
            views: true,
            created_at: true,
            brand: {
              select: {
                nama_brand: true,
              },
            },
          },
        }),
      ]);

    return {
      totalProducts,
      totalBrands,
      totalViews: toCountNumber(totalViewsAggregate._sum.views),
      activeProducts,
      topViewedProducts: topViewedProductsRaw.map((product) => ({
        id: String(product.id),
        nama_produk: product.nama_produk,
        brand_name: product.brand?.nama_brand ?? null,
        views: toCountNumber(product.views),
        created_at: product.created_at ?? null,
      })),
      recentProducts: recentProductsRaw.map((product) => ({
        id: String(product.id),
        nama_produk: product.nama_produk,
        brand_name: product.brand?.nama_brand ?? null,
        views: toCountNumber(product.views),
        created_at: product.created_at ?? null,
      })),
    };
  } catch (error) {
    if (isLegacyProdukTableNotFoundError(error)) {
      return loadDashboardDataFromTableProductRaw();
    }

    if (!isUnknownViewsFieldError(error)) {
      throw error;
    }

    // Fallback: jika Prisma client lokal belum sinkron migrasi `views`,
    // dashboard tetap jalan dengan kolom lama `jumlah_dilihat`.
    const [totalProducts, totalBrands, totalViewsAggregate, activeProducts, topViewedProductsRaw, recentProductsRaw] =
      await Promise.all([
        prisma.product.count(),
        prisma.brand.count(),
        prisma.product.aggregate({
          _sum: {
            jumlah_dilihat: true,
          },
        }),
        prisma.product.count({
          where: {
            status: ProductStatus.aktif,
          },
        }),
        prisma.product.findMany({
          take: 5,
          orderBy: [{ jumlah_dilihat: "desc" }, { created_at: "desc" }],
          select: {
            id: true,
            nama_produk: true,
            jumlah_dilihat: true,
            created_at: true,
            brand: {
              select: {
                nama_brand: true,
              },
            },
          },
        }),
        prisma.product.findMany({
          take: 5,
          orderBy: [{ created_at: "desc" }, { id: "desc" }],
          select: {
            id: true,
            nama_produk: true,
            jumlah_dilihat: true,
            created_at: true,
            brand: {
              select: {
                nama_brand: true,
              },
            },
          },
        }),
      ]);

    return {
      totalProducts,
      totalBrands,
      totalViews: toCountNumber(totalViewsAggregate._sum.jumlah_dilihat),
      activeProducts,
      topViewedProducts: topViewedProductsRaw.map((product) => ({
        id: String(product.id),
        nama_produk: product.nama_produk,
        brand_name: product.brand?.nama_brand ?? null,
        views: toCountNumber(product.jumlah_dilihat),
        created_at: product.created_at ?? null,
      })),
      recentProducts: recentProductsRaw.map((product) => ({
        id: String(product.id),
        nama_produk: product.nama_produk,
        brand_name: product.brand?.nama_brand ?? null,
        views: toCountNumber(product.jumlah_dilihat),
        created_at: product.created_at ?? null,
      })),
    };
  }
}

export default async function AdminDashboardPage() {
  const { totalProducts, totalBrands, totalViews, activeProducts, topViewedProducts, recentProducts } =
    await loadDashboardData();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Dashboard Admin</h1>
          <p className="mt-1 text-sm text-zinc-500">Pantau performa katalog dan aktivitas produk dalam satu tempat.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/produk">Kelola Produk</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/produk/baru">Tambah Produk</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Produk" value={formatNumber(totalProducts)} icon={Package} />
        <MetricCard label="Total Brand" value={formatNumber(totalBrands)} icon={Tags} />
        <MetricCard label="Total Kunjungan Produk" value={formatNumber(totalViews)} icon={Eye} />
        <MetricCard label="Produk Aktif" value={formatNumber(activeProducts)} icon={Activity} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Produk Paling Banyak Dilihat</h2>
            <Button asChild variant="ghost" size="sm" className="text-zinc-600">
              <Link href="/admin/produk">Lihat semua</Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-zinc-500">
                  <th className="px-2 py-2 font-medium">Produk</th>
                  <th className="px-2 py-2 font-medium">Brand</th>
                  <th className="px-2 py-2 text-right font-medium">Views</th>
                </tr>
              </thead>
              <tbody>
                {topViewedProducts.map((product) => (
                  <tr key={product.id} className="border-b last:border-none">
                    <td className="px-2 py-3">
                      <Link href={`/admin/produk/${product.id}`} className="font-medium text-zinc-900 hover:underline">
                        {product.nama_produk}
                      </Link>
                    </td>
                    <td className="px-2 py-3 text-zinc-600">{product.brand_name ?? "-"}</td>
                    <td className="px-2 py-3 text-right font-medium text-zinc-800">{formatNumber(product.views)}</td>
                  </tr>
                ))}
                {topViewedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-2 py-8 text-center text-zinc-500">
                      Belum ada data view produk.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Produk Baru Ditambahkan</h2>
            <Button asChild variant="ghost" size="sm" className="text-zinc-600">
              <Link href="/admin/produk">Lihat semua</Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-zinc-500">
                  <th className="px-2 py-2 font-medium">Produk</th>
                  <th className="px-2 py-2 font-medium">Tanggal</th>
                  <th className="px-2 py-2 text-right font-medium">Views</th>
                </tr>
              </thead>
              <tbody>
                {recentProducts.map((product) => (
                  <tr key={product.id} className="border-b last:border-none">
                    <td className="px-2 py-3">
                      <Link href={`/admin/produk/${product.id}`} className="font-medium text-zinc-900 hover:underline">
                        {product.nama_produk}
                      </Link>
                      <p className="text-xs text-zinc-500">{product.brand_name ?? "-"}</p>
                    </td>
                    <td className="px-2 py-3 text-zinc-600">{formatDate(product.created_at)}</td>
                    <td className="px-2 py-3 text-right font-medium text-zinc-800">{formatNumber(product.views)}</td>
                  </tr>
                ))}
                {recentProducts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-2 py-8 text-center text-zinc-500">
                      Belum ada produk terbaru.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
