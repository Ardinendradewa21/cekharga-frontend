import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AdminMasterDataPage() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Master Data</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola referensi global agar form produk tetap rapi, konsisten, dan tidak perlu upload logo berulang.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Brands</h2>
          <p className="mt-1 text-sm text-slate-500">Tambah, ubah, atau hapus brand yang dipakai produk.</p>
          <Button asChild className="mt-4">
            <Link href="/admin/master-data/brands">Kelola Brands</Link>
          </Button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Marketplaces</h2>
          <p className="mt-1 text-sm text-slate-500">Tambah, ubah, atau hapus marketplace untuk link harga produk.</p>
          <Button asChild className="mt-4">
            <Link href="/admin/master-data/marketplaces">Kelola Marketplaces</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
