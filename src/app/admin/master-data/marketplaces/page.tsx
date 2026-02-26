import { listMarketplacesMasterDataAction } from "@/server/actions/master-data-actions";

import { MarketplacesManager } from "../_components/MarketplacesManager";

export default async function AdminMasterMarketplacesPage() {
  const result = await listMarketplacesMasterDataAction();

  return (
    <MarketplacesManager
      initialItems={result.success ? (result.data ?? []) : []}
      initialError={result.success ? null : result.message}
    />
  );
}
