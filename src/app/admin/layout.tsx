import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

import { AdminLogoutButton } from "./_components/AdminLogoutButton";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-sm font-bold text-slate-900">
              Admin CekHarga
            </Link>
            <Link href="/admin/produk/baru" className="text-sm text-blue-600 hover:underline">
              + Produk Baru
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
              Kembali ke Publik
            </Link>
            {session?.user ? <AdminLogoutButton /> : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
