import Link from "next/link";

import { Button } from "@/components/ui/button";
import { deleteProductAction } from "@/server/actions/product-actions";
import { listBrands, listProducts } from "@/server/repositories/product-repository";

import { FlashMessage } from "./_components/FlashMessage";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const selectedBrand = typeof params.brand === "string" ? params.brand : "";
  const selectedStatus = typeof params.status === "string" ? params.status : "all";
  const sort = typeof params.sort === "string" ? params.sort : "terbaru";
  const type = typeof params.type === "string" ? params.type : undefined;
  const message = typeof params.message === "string" ? params.message : undefined;

  const [result, brands] = await Promise.all([
    listProducts({
      search: q || undefined,
      brandSlugs: selectedBrand ? [selectedBrand] : undefined,
      status: selectedStatus === "aktif" || selectedStatus === "draft" ? selectedStatus : "all",
      page: 1,
      limit: 100,
      sort,
      includeDraft: true,
    }),
    listBrands(),
  ]);

  const formatRupiah = (value: number | null | undefined) => {
    if (!value || value <= 0) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const findMarketplacePrice = (
    links: Array<{ nama_marketplace?: string; harga?: number; status_aktif?: boolean }> | undefined,
    marketplace: string,
  ) => {
    if (!links?.length) return null;

    const lowerName = marketplace.toLowerCase();
    const prices = links
      .filter((link) => link.status_aktif !== false)
      .filter((link) => String(link.nama_marketplace ?? "").toLowerCase().includes(lowerName))
      .map((link) => (typeof link.harga === "number" ? link.harga : null))
      .filter((value): value is number => value !== null);

    if (prices.length === 0) return null;
    return Math.min(...prices);
  };

  return (
    <div>
      <FlashMessage type={type} message={message} />

      <div className="mb-4 flex flex-col gap-3 rounded-xl border bg-white p-4 md:flex-row md:items-center md:justify-between">
        <form method="GET" className="grid w-full gap-2 md:grid-cols-5">
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari nama produk..."
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
          />
          <select
            name="brand"
            defaultValue={selectedBrand}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">Semua Brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.slug}>
                {brand.nama_brand}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={selectedStatus}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="all">Semua Status</option>
            <option value="aktif">aktif</option>
            <option value="draft">draft</option>
          </select>
          <select
            name="sort"
            defaultValue={sort}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="terbaru">Terbaru</option>
            <option value="brand_asc">Brand A-Z</option>
            <option value="brand_desc">Brand Z-A</option>
          </select>
          <Button type="submit" variant="outline">
            Terapkan
          </Button>
        </form>
        <Link href="/admin/produk/baru">
          <Button>Tambah Produk</Button>
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Nama Produk</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Harga Shopee</th>
              <th className="px-4 py-3">Harga Tokopedia</th>
              <th className="px-4 py-3">Harga Blibli</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {result.data.map((product) => {
              const deleteAction = deleteProductAction.bind(null, product.id);
              const brand = product.brand as { nama_brand?: string } | null;
              const links =
                (product.marketplace_links as Array<{
                  nama_marketplace?: string;
                  harga?: number;
                  status_aktif?: boolean;
                }> | undefined) ?? [];
              const shopeePrice = findMarketplacePrice(links, "shopee");
              const tokopediaPrice = findMarketplacePrice(links, "tokopedia");
              const blibliPrice = findMarketplacePrice(links, "blibli");

              return (
                <tr key={product.id} className="border-t">
                  <td className="px-4 py-3 font-medium text-slate-900">{product.nama_produk}</td>
                  <td className="px-4 py-3 text-slate-600">{brand?.nama_brand || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatRupiah(shopeePrice)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatRupiah(tokopediaPrice)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatRupiah(blibliPrice)}</td>
                  <td className="px-4 py-3 text-slate-600">{product.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/produk/${product.id}`}>
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                      </Link>
                      <form action={deleteAction}>
                        <Button size="sm" variant="destructive">
                          Hapus
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {result.data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  Tidak ada data produk.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
