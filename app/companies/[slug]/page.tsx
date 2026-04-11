import Link from "next/link";
import type { Metadata } from "next";
import dynamicImport from "next/dynamic";
import { notFound } from "next/navigation";
import Script from "next/script";

import { getCompanyDetailData, getLeaderboardRefreshState } from "@/lib/db/queries";
import { formatTrendPercent, getTrendPercentTone } from "@/lib/score-history";
import { companies } from "@/lib/seed/data";
import { getSiteUrl } from "@/lib/site";
import { formatDateLabel, formatScore, formatUpdateTimestamp, hasDisplayText, hasMeaningfulMetric, toCompleteSentence } from "@/lib/utils";

import { ModuleStatusStrip } from "@/components/module-status-strip";
import { NewsCard } from "@/components/news-card";
import { SectionHeader } from "@/components/section-header";
import { ShareButton } from "@/components/share-button";
import { ScorePill } from "@/components/score-pill";
import { TrendSparkline } from "@/components/trend-sparkline";

const CategoryDonut = dynamicImport(
  () => import("@/components/category-donut").then((module) => module.CategoryDonut),
  {
    loading: () => <div className="surface-subtle h-[260px] w-full rounded-full border border-[var(--border)]" aria-hidden="true" />,
  },
);
const ScoreBreakdownChart = dynamicImport(
  () => import("@/components/score-breakdown-chart").then((module) => module.ScoreBreakdownChart),
  {
    loading: () => <div className="surface-subtle h-[320px] w-full rounded-2xl border border-[var(--border)]" aria-hidden="true" />,
  },
);

export const revalidate = 300;

export function generateStaticParams() {
  return companies.map((company) => ({
    slug: company.slug,
  }));
}

function formatMetricValue(value: number | null | undefined, { digits = 0, suffix = "" }: { digits?: number; suffix?: string } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "—";
  }

  return `${value.toFixed(digits)}${suffix}`;
}

function formatTrendMetric(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value === 0) {
    return "—";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const record = await getCompanyDetailData(slug);

  if (!record) {
    return {
      title: "Company Not Found",
    };
  }

  const siteUrl = getSiteUrl();

  return {
    title: record.company.name,
    description: record.company.description,
    openGraph: {
      title: record.company.name,
      description: record.company.description,
      url: `${siteUrl}/companies/${slug}`,
      type: "profile",
      siteName: "Frontier Pulse",
    },
    twitter: {
      card: "summary",
      title: record.company.name,
      description: record.company.description,
    },
  };
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [record, refreshState] = await Promise.all([getCompanyDetailData(slug), getLeaderboardRefreshState()]);

  if (!record) {
    notFound();
  }

  const { company } = record;
  const momentum = record.momentum ?? undefined;
  const enrichment = record.enrichment ?? undefined;
  const recentNews = record.recentNews ?? [];
  const partnerships = record.partnerships ?? [];
  const milestones = record.milestones ?? [];
  const categoryBreakdown = record.categoryBreakdown ?? [];
  const scoreBreakdown = record.scoreBreakdown ?? [];
  const safeTags = company.tags ?? [];
  const safeProducts = company.products ?? [];
  const safeStrengths = company.strengths ?? [];
  const safeWeaknesses = company.weaknesses ?? [];
  const sentimentSeries = enrichment?.sentimentHistory?.map((entry) => entry.score) ?? [];
  const totalCoverageValue = enrichment ? formatMetricValue(enrichment.totalNewsCount) : "—";
  const avgImportanceValue = enrichment ? formatMetricValue(enrichment.avgImportanceScore, { digits: 1, suffix: "/10" }) : "—";
  const activeStreakValue = enrichment ? formatMetricValue(enrichment.activeStreak, { suffix: "d" }) : "—";
  const sentimentTrendValue = enrichment ? formatTrendMetric(enrichment.sentimentTrend) : "—";
  const metricCards = [
    {
      label: "Total Coverage",
      value: totalCoverageValue,
    },
    {
      label: "Avg Importance",
      value: avgImportanceValue,
    },
    {
      label: "Active Streak",
      value: activeStreakValue,
    },
    {
      label: "Sentiment Trend",
      value: sentimentTrendValue,
      chart:
        sentimentTrendValue !== "—" && sentimentSeries.some((entry) => Math.abs(entry) >= 0.01)
          ? (
              <div className="mt-4">
                <TrendSparkline
                  data={sentimentSeries}
                  color={(enrichment?.sentimentTrend ?? 0) >= 0 ? "var(--accent-green)" : "var(--accent-red)"}
                  height={56}
                />
              </div>
            )
          : null,
    },
  ].filter((item) => item.value !== "—");
  const showMomentum = Boolean(momentum && hasMeaningfulMetric(momentum.score));
  const sevenDayTrend = momentum?.trendPercent7d;
  const sevenDayTrendLabel = sevenDayTrend ? formatTrendPercent(sevenDayTrend) : "N/A";
  const sevenDayTrendTone = sevenDayTrend ? getTrendPercentTone(sevenDayTrend) : "neutral";
  const sevenDayTrendClasses =
    sevenDayTrendTone === "up"
      ? "border-[var(--accent-green-border)] bg-[var(--accent-green-soft)] text-[var(--accent-green)]"
      : sevenDayTrendTone === "down"
        ? "border-[var(--accent-red-border)] bg-[var(--accent-red-soft)] text-[var(--accent-red)]"
        : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)]";
  const latestCoverageAt = recentNews[0]?.publishedAt ?? null;
  const staleWarning =
    refreshState.status === "stale" && refreshState.lastUpdatedAt
      ? `Ranking data for this company is behind the coverage stream. The visible score surface last refreshed ${formatUpdateTimestamp(refreshState.lastUpdatedAt).toLowerCase()}.`
      : null;
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    description: company.description,
    url: `${getSiteUrl()}/companies/${company.slug}`,
  };

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <Script
        id={`company-${company.slug}-organization-jsonld`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <section className="fade-slide-up space-y-8">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="surface-card rounded-3xl border border-[var(--border)] p-8 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <span className="h-5 w-5 rounded-full border border-white/10" style={{ backgroundColor: company.color }} />
              <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                Company Profile
              </p>
            </div>
            <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
              <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-5xl">
                {company.name}
              </h1>
              <div className="flex items-center gap-2">
                <Link
                  href={`/feed/${company.slug}`}
                  className="rounded-full border border-[var(--border)] px-3 py-2 text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--accent-blue-border)] hover:text-[var(--text-primary)]"
                >
                  RSS Feed
                </Link>
                <ShareButton path={`/companies/${company.slug}`} title={company.name} text={company.description} />
              </div>
            </div>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--text-secondary)]">{toCompleteSentence(company.overview)}</p>
            <div className="mt-6">
              <ModuleStatusStrip
                items={[
                  { label: "Coverage", value: latestCoverageAt ? formatUpdateTimestamp(latestCoverageAt) : "Unavailable" },
                  { label: "Recent stories", value: recentNews.length.toString() },
                  { label: "Score", value: refreshState.lastUpdatedAt ? formatUpdateTimestamp(refreshState.lastUpdatedAt) : "Unavailable" },
                ]}
                warning={staleWarning}
              />
            </div>
            {safeTags.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {safeTags.map((tag) => (
                  <span
                    key={tag}
                    className="surface-soft rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="surface-card rounded-3xl border border-[var(--border)] p-8 backdrop-blur-sm">
            <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--accent-green)]">
              Momentum Score
            </p>
            {showMomentum && momentum ? (
              <>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <p className={momentum.score >= 0 ? "text-5xl text-[var(--accent-green)]" : "text-5xl text-[var(--accent-red)]"}>
                    {formatScore(momentum.score)}
                  </p>
                  <span className="font-[family-name:var(--font-mono)] text-sm text-[var(--text-tertiary)]">
                    {momentum.trend} {sevenDayTrendLabel} vs 7d ago
                  </span>
                </div>
                <div className="surface-inline mt-6 rounded-2xl border border-[var(--border)] p-4">
                  <TrendSparkline
                    data={momentum.sparkline}
                    color={momentum.score >= 0 ? "var(--accent-green)" : "var(--accent-red)"}
                    variant="area"
                    height={90}
                  />
                </div>
                <div className="mt-6 flex gap-3">
                  <ScorePill value={momentum.scoreChange24h ?? 0} label="24h" />
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 font-[family-name:var(--font-mono)] text-xs font-medium tracking-[0.08em] ${sevenDayTrendClasses}`}
                  >
                    <span className="mr-2 opacity-80">7d</span>
                    {sevenDayTrendLabel}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{toCompleteSentence(momentum.keyDriver)}</p>
              </>
            ) : (
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">Score pending.</p>
            )}
          </div>
        </div>
      </section>

      {metricCards.length > 0 ? (
        <section className="fade-slide-up mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-4" style={{ animationDelay: "0.05s" }}>
          {metricCards.map((card) => (
            <div key={card.label} className="surface-card rounded-2xl border border-[var(--border)] p-5 backdrop-blur-sm">
              <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                {card.label}
              </p>
              <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
                {card.value}
              </p>
              {card.chart}
            </div>
          ))}
        </section>
      ) : null}

      {safeStrengths.length > 0 || safeWeaknesses.length > 0 ? (
        <section className="fade-slide-up mt-16 grid gap-5 lg:grid-cols-2" style={{ animationDelay: "0.08s" }}>
          {safeStrengths.length > 0 ? (
            <div className="surface-card rounded-2xl border border-[var(--border)] p-6 backdrop-blur-sm">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
                Strengths
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
                {safeStrengths.map((strength) => (
                  <li key={strength}>• {toCompleteSentence(strength)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {safeWeaknesses.length > 0 ? (
            <div className="surface-card rounded-2xl border border-[var(--border)] p-6 backdrop-blur-sm">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
                Weaknesses
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
                {safeWeaknesses.map((weakness) => (
                  <li key={weakness}>• {toCompleteSentence(weakness)}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {scoreBreakdown.length > 0 ? (
        <section className="fade-slide-up mt-16 space-y-8" style={{ animationDelay: "0.11s" }}>
          <SectionHeader
            label="SCORE BREAKDOWN"
            title="What actually drove the score"
            subtitle="Daily event attribution across the last visible company events."
            tone="green"
          />
          <ScoreBreakdownChart rows={scoreBreakdown} />
        </section>
      ) : null}

      {safeProducts.length > 0 ? (
        <section className="fade-slide-up mt-16 space-y-8" style={{ animationDelay: "0.14s" }}>
          <SectionHeader
            label="KEY PRODUCTS"
            title="Models and products shaping the current position"
            tone="blue"
          />
          <div className="grid gap-5 md:grid-cols-2">
            {safeProducts.map((product) => (
              <div
                key={product.name}
                className="surface-card rounded-2xl border border-[var(--border)] p-6 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
                    {product.name}
                  </h3>
                  <span className="rounded-full border border-[var(--border)] px-3 py-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                    {product.type}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{toCompleteSentence(product.description)}</p>
                {product.launchDate ? (
                  <p className="mt-4 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                    Launch date: {formatDateLabel(product.launchDate)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {recentNews.length > 0 ? (
        <section className="fade-slide-up mt-16 space-y-8" style={{ animationDelay: "0.2s" }}>
          <SectionHeader
            label="RECENT NEWS"
            title="What changed and why it matters"
            tone="amber"
          />
          <div className="grid gap-5 xl:grid-cols-2">
            {recentNews.map((item) => (
              <NewsCard key={item.slug} news={item} defaultExpanded />
            ))}
          </div>
        </section>
      ) : null}

      <section className="fade-slide-up mt-16 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]" style={{ animationDelay: "0.26s" }}>
        {milestones.length > 0 ? (
          <div className="surface-card rounded-2xl border border-[var(--border)] p-6 backdrop-blur-sm">
            <SectionHeader label="MILESTONES" title="Recent timeline" tone="purple" />
            <div className="mt-6 space-y-5">
              {milestones.map((milestone) => (
                <div key={milestone.title} className="border-l border-[var(--border)] pl-5">
                  <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                    {formatDateLabel(milestone.date)}
                  </p>
                  <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--text-primary)]">
                    {milestone.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{toCompleteSentence(milestone.detail)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-5">
          {categoryBreakdown.length > 0 ? (
            <div className="surface-card rounded-2xl border border-[var(--border)] p-6 backdrop-blur-sm">
              <SectionHeader label="CATEGORY MIX" title="Coverage breakdown" tone="amber" />
              <CategoryDonut data={categoryBreakdown} />
              <div className="mt-4 flex flex-wrap gap-2">
                {categoryBreakdown.map((entry) => (
                  <span key={entry.slug} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                    {entry.name} · {entry.count}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {partnerships.length > 0 ? (
            <div className="surface-card rounded-2xl border border-[var(--border)] p-6 backdrop-blur-sm">
              <SectionHeader label="PARTNERSHIPS" title="Strategic ties" tone="green" />
              <div className="mt-6 space-y-4">
                {partnerships.map((partnership) => (
                  <div key={partnership.name} className="surface-inline rounded-2xl border border-[var(--border)] p-4">
                    <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--text-primary)]">
                      {partnership.name}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{toCompleteSentence(partnership.detail)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {hasDisplayText(company.valuationText) ? (
            <div className="surface-card rounded-2xl border border-[var(--border)] p-6 backdrop-blur-sm">
              <SectionHeader label="FUNDING / VALUATION" title="Capital context" tone="blue" />
              <p className="mt-6 text-sm leading-6 text-[var(--text-secondary)]">
                {toCompleteSentence(company.valuationText)}
              </p>
            </div>
          ) : null}

          {hasDisplayText(company.whyItMatters) ? (
            <div className="rounded-2xl border border-[var(--accent-purple-border)] bg-[var(--accent-purple-soft)] p-6 backdrop-blur-sm">
              <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--accent-purple)]">
                Why this company matters
              </p>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{toCompleteSentence(company.whyItMatters)}</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
