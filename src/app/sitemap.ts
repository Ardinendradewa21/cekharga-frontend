import type { MetadataRoute } from "next";
import { ProductStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: absoluteUrl("/bandingkan"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  try {
    const products = await prisma.product.findMany({
      where: {
        status: ProductStatus.aktif,
      },
      select: {
        slug: true,
        updated_at: true,
      },
      orderBy: {
        updated_at: "desc",
      },
      take: 5000,
    });

    const productPages: MetadataRoute.Sitemap = products.map((product) => ({
      url: absoluteUrl(`/produk/${product.slug}`),
      lastModified: product.updated_at ?? new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    }));

    return [...staticPages, ...productPages];
  } catch (error) {
    console.error("Failed to load products for sitemap:", error);
    return staticPages;
  }
}
