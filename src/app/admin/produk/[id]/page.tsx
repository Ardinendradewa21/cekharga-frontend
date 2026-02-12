import { notFound } from "next/navigation";

import { updateProductAction } from "@/server/actions/product-actions";
import { getProductById, listBrands, listMarketplaces } from "@/server/repositories/product-repository";

import { FlashMessage } from "../../_components/FlashMessage";
import { ProductForm } from "../../_components/ProductForm";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const routeParams = await params;
  const parsedId = Number(routeParams.id);

  if (!Number.isFinite(parsedId)) {
    return notFound();
  }

  const [product, brands, marketplaces, query] = await Promise.all([
    getProductById(parsedId),
    listBrands(),
    listMarketplaces(),
    searchParams,
  ]);

  if (!product) {
    return notFound();
  }

  const type = typeof query.type === "string" ? query.type : undefined;
  const message = typeof query.message === "string" ? query.message : undefined;
  const updateAction = updateProductAction.bind(null, parsedId);

  return (
    <div>
      <FlashMessage type={type} message={message} />
      <ProductForm
        title={`Edit Produk: ${product.nama_produk}`}
        description="Perubahan akan memperbarui tabel produk, spesifikasi, marketplace_links, dan reviews."
        submitLabel="Update Produk"
        brands={brands}
        marketplaces={marketplaces}
        initialData={product}
        action={updateAction}
      />
    </div>
  );
}
