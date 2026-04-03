import type { MetadataRoute } from "next";

import { getCompaniesIndexData } from "@/lib/db/queries";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const companies = await getCompaniesIndexData();
  const now = new Date();

  const staticRoutes = [
    "",
    "/about",
    "/companies",
    "/compare",
    "/daily-digest",
    "/leaderboard",
    "/news",
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
  ];
}
