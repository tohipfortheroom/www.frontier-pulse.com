import type {
  CompanyEnrichment,
  CompanyProfile,
  DailyDigest,
  LaunchCardData,
  Milestone,
  MomentumSnapshot,
  NewsItem,
  Partnership,
  PowerRankingSeed,
  ReactionType,
  TimelineEntry,
  TopMover,
  TrendingTopic,
  HomeTickerItem,
} from "@/lib/seed/data";

export type CompanyCardRecord = {
  company: CompanyProfile;
  activityCount: number;
  momentum?: MomentumSnapshot;
};

export type CompanyDetailRecord = {
  company: CompanyProfile;
  momentum?: MomentumSnapshot;
  recentNews: NewsItem[];
  partnerships: Partnership[];
  milestones: Milestone[];
  enrichment?: CompanyEnrichment;
  scoreBreakdown: Array<{
    date: string;
    label: string;
    total: number;
    eventType: string;
    scoreDelta: number;
    explanation: string;
  }>;
  categoryBreakdown: Array<{
    slug: string;
    name: string;
    count: number;
  }>;
};

export type HomePageData = {
  todayStories: NewsItem[];
  breakingStories: NewsItem[];
  leaderboard: MomentumSnapshot[];
  launches: LaunchCardData[];
  timeline: TimelineEntry[];
  topMovers: TopMover[];
  trendingTopics: TrendingTopic[];
  digest: DailyDigest;
  tickerItems: HomeTickerItem[];
  stats: {
    totalStories: number;
    totalCompanies: number;
    totalLaunches: number;
    lastUpdatedAt: string;
    seedMode: boolean;
  };
};

export type DailyDigestRecord = {
  digest: DailyDigest;
  topStories: NewsItem[];
  biggestWinnerMomentum?: MomentumSnapshot;
  biggestLoserMomentum?: MomentumSnapshot;
  mostImportantStory: NewsItem;
};

export type NewsDetailRecord = {
  news: NewsItem;
  relatedStories: NewsItem[];
  moreFromCompany: NewsItem[];
};

export type ReactionSummary = {
  counts: Record<ReactionType, number>;
  selected: ReactionType | null;
};

export type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string;
  overview: string;
  strengths: string[] | null;
  weaknesses: string[] | null;
  why_it_matters: string;
  valuation_text: string | null;
  website_url: string;
  enrichment_data?: CompanyEnrichment | null;
  created_at: string;
  updated_at: string;
};

export type CompanyProductRow = {
  id: string;
  company_id: string;
  name: string;
  type: string;
  description: string;
  launch_date: string | null;
  created_at: string;
};

export type NewsItemRow = {
  id: string;
  headline: string;
  slug: string;
  source_name: string;
  source_url: string;
  canonical_url?: string | null;
  title_fingerprint?: string | null;
  published_at: string;
  ingested_at: string;
  last_seen_at?: string;
  raw_text: string | null;
  cleaned_text: string | null;
  summary: string;
  short_summary: string;
  why_it_matters: string;
  summarizer_model?: string | null;
  importance_score: number;
  confidence_score: number;
  impact_direction: "positive" | "negative" | "neutral";
  created_at: string;
  updated_at?: string;
};

export type EventRow = {
  id: string;
  company_id: string;
  news_item_id: string | null;
  event_type: string;
  score_delta: number;
  event_date: string;
  explanation: string;
  created_at: string;
};

export type MomentumScoreRow = {
  id: string;
  company_id: string;
  score: number;
  score_change_24h: number;
  score_change_7d: number;
  calculated_at: string;
};

export type DailyDigestRow = {
  id: string;
  digest_date: string;
  title: string;
  summary: string;
  narrative?: string | null;
  headline_of_the_day?: string | null;
  themes?: string[] | null;
  biggest_winner_company_id: string;
  biggest_loser_company_id: string;
  most_important_news_item_id: string | null;
  top_story_slugs: string[];
  watch_next: string[];
  created_at: string;
};

export type ReactionRow = {
  id: string;
  news_item_id: string;
  reaction_type: ReactionType;
  visitor_id: string;
  created_at: string;
};

export type StorySimilarityRow = {
  id: string;
  story_id: string;
  similar_story_id: string;
  similarity: number;
  created_at: string;
};

export type PowerRankingRecord = PowerRankingSeed;

export type HeatmapEvent = {
  eventType: string;
  scoreDelta: number;
  explanation: string;
};

export type HeatmapCell = {
  companySlug: string;
  companyName: string;
  companyColor: string;
  date: string;
  eventCount: number;
  netScore: number;
  events: HeatmapEvent[];
};

export type HeatmapCompany = {
  slug: string;
  name: string;
  color: string;
};

export type HeatmapData = {
  cells: HeatmapCell[];
  dates: string[];
  companies: HeatmapCompany[];
  lastUpdatedAt: string;
};
