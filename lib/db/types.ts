import type {
  CompanyProfile,
  DailyDigest,
  LaunchCardData,
  Milestone,
  MomentumSnapshot,
  NewsItem,
  Partnership,
  TimelineEntry,
  TopMover,
  TrendingTopic,
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
};

export type DailyDigestRecord = {
  digest: DailyDigest;
  topStories: NewsItem[];
  biggestWinnerMomentum?: MomentumSnapshot;
  biggestLoserMomentum?: MomentumSnapshot;
  mostImportantStory: NewsItem;
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
  published_at: string;
  ingested_at: string;
  raw_text: string | null;
  cleaned_text: string | null;
  summary: string;
  short_summary: string;
  why_it_matters: string;
  importance_score: number;
  confidence_score: number;
  impact_direction: "positive" | "negative" | "neutral";
  created_at: string;
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
  biggest_winner_company_id: string;
  biggest_loser_company_id: string;
  most_important_news_item_id: string | null;
  top_story_slugs: string[];
  watch_next: string[];
  created_at: string;
};
