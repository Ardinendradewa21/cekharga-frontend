"use client";

import dynamic from "next/dynamic";

// ssr: false mencegah SSR HomePageClient sehingga tidak ada hydration mismatch.
// Harus berada di Client Component — next/dynamic dengan ssr: false tidak boleh di Server Component.
const HomePageClient = dynamic(() => import("./HomePageClient"), {
  ssr: false,
});

export default function HomePageClientLoader() {
  return <HomePageClient />;
}
