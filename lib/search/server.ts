import { getCompaniesIndexData } from "@/lib/db/queries";
import { getSupabaseServerClient } from "@/lib/db/client";
import { sortedNewsItems } from "@/lib/seed/data";
import { formatScore } from "@/lib/utils";

import { matchesSearchQuery, toWebSearchQuery } from "@/lib/search/syntax";
import type { SearchCompanyResult, SearchNewsResult, SearchResponse } from "@/lib/search/types";

function buildCompanyResult(record: Awaited<ReturnType<typeof getCompaniesIndexData>>[number]): SearchCompanyResult {
  return {
    slug: record.company.slug,
    name: record.company.name,
    description: record.company.description,
    href: `/companies/${record.company.slug}`,
    momentumLabel: record.momentum ? formatScore(record.momentum.score) : undefined,
  };
}

function fallbackNewsSearch(query: string, limit: number) {
  return sortedNewsItems
    .filter((item) =>
      matchesSearchQuery(
        [item.headline, item.summary, item.shortSummary, item.whyItMatters, item.sourceName].join(" "),
        query,
      ),
    )
    .slice(0, limit)
    .map<SearchNewsResult>((item) => ({
      slug: item.slug,
      headline: item.headline,
      summary: item.shortSummary || item.summary,
      sourceName: item.sourceName,
      publishedAt: item.publishedAt,
      href: `/news#${item.slug}`,
    }));
}

export async function searchSite(query: string, limit = 6): Promise<SearchResponse> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return {
      companies: [],
      news: [],
    };
  }

  const companyRecords = await getCompaniesIndexData();
  const companies = companyRecords
    .filter((record) =>
      matchesSearchQuery(
        [
          record.company.name,
          record.company.description,
          record.company.overview,
          ...record.company.tags,
          ...record.company.products.map((product) => product.name),
        ].join(" "),
        normalizedQuery,
      ),
    )
    .slice(0, limit)
    .map(buildCompanyResult);

  const client = getSupabaseServerClient();

  if (!client) {
    return {
      companies,
      news: fallbackNewsSearch(normalizedQuery, limit),
    };
  }

  const { data, error } = await client
    .from("news_items")
    .select("slug, headline, summary, short_summary, source_name, published_at, importance_score")
    .textSearch("search_vector", toWebSearchQuery(normalizedQuery), {
      config: "english",
      type: "websearch",
    })
    .order("importance_score", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return {
      companies,
      news: fallbackNewsSearch(normalizedQuery, limit),
    };
  }

  return {
    companies,
    news: data.map<SearchNewsResult>((item) => ({
      slug: item.slug,
      headline: item.headline,
      summary: item.short_summary || item.summary,
      sourceName: item.source_name,
      publishedAt: item.published_at,
      href: `/news#${item.slug}`,
    })),
  };
}
