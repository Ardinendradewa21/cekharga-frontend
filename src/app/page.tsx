import type { Metadata } from "next";

import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/seo";
import HomePageClientLoader from "./_components/HomePageClientLoader";

export const metadata: Metadata = {
  title: `${SITE_NAME} - Aggregator Harga & Spesifikasi HP`,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: `${SITE_NAME} - Aggregator Harga & Spesifikasi HP`,
    description: SITE_DESCRIPTION,
    type: "website",
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - Aggregator Harga & Spesifikasi HP`,
    description: SITE_DESCRIPTION,
  },
};

export default function HomePage() {
  const webSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/")}?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
      />
      <HomePageClientLoader />
    </>
  );
}
