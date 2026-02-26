import { Poppins } from "next/font/google";

import { getSafeServerSession } from "@/server/auth/session";

import { AdminShell } from "./_components/AdminShell";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSafeServerSession();

  return (
    <div className={poppins.className}>
      <AdminShell userName={session?.user?.name ?? null} userEmail={session?.user?.email ?? null}>
        {children}
      </AdminShell>
    </div>
  );
}
