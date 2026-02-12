import { createProductAction } from "@/server/actions/product-actions";
import { listBrands, listMarketplaces } from "@/server/repositories/product-repository";

import { FlashMessage } from "../../_components/FlashMessage";
import { ProductForm } from "../../_components/ProductForm";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewProductPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const type = typeof params.type === "string" ? params.type : undefined;
  const message = typeof params.message === "string" ? params.message : undefined;

  const [brands, marketplaces] = await Promise.all([listBrands(), listMarketplaces()]);

  return (
    <div>
      <FlashMessage type={type} message={message} />
      <ProductForm
        title="Tambah Produk Baru"
        description="Isi kolom produk, spesifikasi, dan relasi marketplace/review sesuai struktur SQL."
        submitLabel="Simpan Produk"
        brands={brands}
        marketplaces={marketplaces}
        action={createProductAction}
      />
    </div>
  );
}
