import { Plus_Jakarta_Sans } from "next/font/google";

import { getSafeServerSession } from "@/server/auth/session";

import { AdminShell } from "./_components/AdminShell";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
});

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSafeServerSession();

  return (
    <div className={plusJakartaSans.className}>
      <AdminShell userName={session?.user?.name ?? null} userEmail={session?.user?.email ?? null}>
        {children}
      </AdminShell>
    </div>
  );
}
