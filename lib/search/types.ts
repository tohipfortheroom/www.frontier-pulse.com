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
  href: string;
};

export type SearchResponse = {
  companies: SearchCompanyResult[];
  news: SearchNewsResult[];
};
