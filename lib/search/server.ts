import { getCompaniesIndexData } from "@/lib/db/queries";
import { getSupabaseServerClient } from "@/lib/db/client";
import { CACHE_TAGS, createInstrumentedCache } from "@/lib/server-cache";
import { companies as seedCompanies, categories, tags, sortedNewsItems } from "@/lib/seed/data";
import { formatScore } from "@/lib/utils";

import { extractDateFilters, getTextQuery, matchesSearchQuery, toWebSearchQuery } from "@/lib/search/syntax";
import type { SearchCompanyResult, SearchNewsResult, SearchResponse, SearchSuggestion } from "@/lib/search/types";

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
  const dateFilters = extractDateFilters(query);

  return sortedNewsItems
    .filter((item) => {
      // Date filter check
      if (dateFilters.before && new Date(item.publishedAt) > dateFilters.before) return false;
      if (dateFilters.after && new Date(item.publishedAt) < dateFilters.after) return false;

      return matchesSearchQuery(
        [item.headline, item.summary, item.shortSummary, item.whyItMatters, item.sourceName].join(" "),
        query,
      );
    })
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

function buildSuggestions(query: string): SearchSuggestion[] {
  const lower = query.toLowerCase();
  if (!lower) return [];

  const suggestions: SearchSuggestion[] = [];

  // Company name autocomplete
  for (const company of seedCompanies) {
    if (
      company.name.toLowerCase().includes(lower) ||
      company.shortName.toLowerCase().includes(lower)
    ) {
      suggestions.push({
        type: "company",
        label: company.name,
        query: `"${company.name}"`,
      });
    }
    if (suggestions.length >= 3) break;
  }

  // Category autocomplete
  for (const cat of categories) {
    if (cat.name.toLowerCase().includes(lower)) {
      suggestions.push({
        type: "category",
        label: cat.name,
        query: cat.name,
      });
    }
    if (suggestions.length >= 5) break;
  }

  // Tag autocomplete
  for (const tag of tags) {
    if (tag.name.toLowerCase().includes(lower)) {
      suggestions.push({
        type: "tag",
        label: tag.name,
        query: tag.name,
      });
    }
    if (suggestions.length >= 8) break;
  }

  return suggestions.slice(0, 8);
}

const searchSiteCached = createInstrumentedCache(
  "site_search",
  async (normalizedQuery: string, limit: number): Promise<SearchResponse> => {
    const textQuery = getTextQuery(normalizedQuery);
    const suggestions = buildSuggestions(textQuery);

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
          textQuery,
        ),
      )
      .slice(0, limit)
      .map(buildCompanyResult);

    const client = getSupabaseServerClient();
    const dateFilters = extractDateFilters(normalizedQuery);

    if (!client) {
      return {
        companies,
        news: fallbackNewsSearch(normalizedQuery, limit),
        suggestions,
      };
    }

    let supabaseQuery = client
      .from("news_items")
      .select("slug, headline, summary, short_summary, source_name, published_at, importance_score");

    if (textQuery) {
      supabaseQuery = supabaseQuery.textSearch("search_vector", toWebSearchQuery(normalizedQuery), {
        config: "english",
        type: "websearch",
      });
    }

    if (dateFilters.before) {
      supabaseQuery = supabaseQuery.lte("published_at", dateFilters.before.toISOString());
    }
    if (dateFilters.after) {
      supabaseQuery = supabaseQuery.gte("published_at", dateFilters.after.toISOString());
    }

    const { data, error } = await supabaseQuery
      .order("importance_score", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      return {
        companies,
        news: fallbackNewsSearch(normalizedQuery, limit),
        suggestions,
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
      suggestions,
    };
  },
  {
    key: "api:site-search",
    revalidate: 60,
    tags: [CACHE_TAGS.siteContent],
    module: "api",
    describeArgs: (normalizedQuery, limit) => ({ query: normalizedQuery, limit }),
  },
);

export async function searchSite(query: string, limit = 6): Promise<SearchResponse> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return {
      companies: [],
      news: [],
    };
  }

  return searchSiteCached(normalizedQuery, limit);
}
