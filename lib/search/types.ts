export type SearchCompanyResult = {
  slug: string;
  name: string;
  description: string;
  href: string;
  momentumLabel?: string;
};

export type SearchNewsResult = {
  slug: string;
  headline: string;
  summary: string;
  sourceName: string;
  publishedAt: string;
  companySlugs?: string[];
  href: string;
};

export type SearchSuggestion = {
  type: "recent" | "company" | "category" | "tag";
  label: string;
  query: string;
};

export type SearchResponse = {
  companies: SearchCompanyResult[];
  news: SearchNewsResult[];
  suggestions?: SearchSuggestion[];
};
