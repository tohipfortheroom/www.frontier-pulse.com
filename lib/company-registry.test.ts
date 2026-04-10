import { describe, expect, it } from "vitest";

import { getTrackedCompanySummary, TRACKED_COMPANY_COUNT } from "@/lib/company-registry";
import type { CompanyCardRecord } from "@/lib/db/types";
import type { CompanyProfile } from "@/lib/seed/data";

function createCompany(slug: string, name: string): CompanyProfile {
  return {
    slug,
    name,
    shortName: name,
    color: "#111111",
    description: `${name} description.`,
    overview: `${name} overview.`,
    strengths: [],
    weaknesses: [],
    whyItMatters: `${name} matters.`,
    websiteUrl: `https://${slug}.example.com`,
    tags: [],
    products: [],
    partnerships: [],
    milestones: [],
    sparkline: [1, 2, 3],
  };
}

describe("company registry summary", () => {
  it("uses one tracked-company count across the product", () => {
    expect(TRACKED_COMPANY_COUNT).toBe(15);
  });

  it("separates tracked companies from the top-10 ranking surface", () => {
    const records: CompanyCardRecord[] = Array.from({ length: 12 }, (_, index) => ({
      company: createCompany(`company-${index + 1}`, `Company ${index + 1}`),
      activityCount: 3,
      momentum: {
        companySlug: `company-${index + 1}`,
        rank: index + 1,
        score: 20 - index,
        scoreChange24h: 1,
        scoreChange7d: 2,
        trend: "↑",
        keyDriver: "Company moved.",
        sparkline: [1, 2, 3],
        driverNewsSlugs: [],
      },
    }));

    expect(getTrackedCompanySummary(records)).toMatchObject({
      trackedCount: 12,
      rankedCount: 12,
      rankingSurfaceCount: 10,
    });
  });
});
