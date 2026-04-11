import type { MetadataRoute } from "next";

import { getCompaniesIndexData, getNewsItemsData } from "@/lib/db/queries";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const [companies, newsItems] = await Promise.all([getCompaniesIndexData(), getNewsItemsData()]);
  const now = new Date();

  const staticRoutes = [
    "",
    "/about",
    "/companies",
    "/compare",
    "/daily-digest",
    "/heatmap",
    "/leaderboard",
    "/news",
    "/timeline",
    "/trending",
  ];

  return [
    ...staticRoutes.map((route) => {
      const changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = route === "" ? "hourly" : "daily";

      return {
        url: `${siteUrl}${route}`,
        lastModified: now,
        changeFrequency,
        priority: route === "" ? 1 : 0.7,
      };
    }),
    ...companies.map((record) => ({
      url: `${siteUrl}/companies/${record.company.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...newsItems.slice(0, 250).map((item) => ({
      url: `${siteUrl}/news/${item.slug}`,
      lastModified: new Date(item.publishedAt),
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}
