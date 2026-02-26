import { listBrandsMasterDataAction } from "@/server/actions/master-data-actions";

import { BrandsManager } from "../_components/BrandsManager";

export default async function AdminMasterBrandsPage() {
  const result = await listBrandsMasterDataAction();

  return (
    <BrandsManager
      initialItems={result.success ? (result.data ?? []) : []}
      initialError={result.success ? null : result.message}
    />
  );
}
