"use client";

import { categoriesBySlug, seedNow, type NewsItem } from "@/lib/seed/data";
import { accentClasses, cn, formatRelativeTime, formatTimestamp } from "@/lib/utils";

import { BookmarkButton } from "@/components/bookmark-button";
import { CompanyBadge } from "@/components/company-badge";
import { ShareButton } from "@/components/share-button";
import { CategoryPill, TagPill } from "@/components/tag-pill";

type NewsCardProps = {
  news: NewsItem;
  mode?: "default" | "breaking" | "compact";
};

function importanceCopy(news: NewsItem) {
  if (news.importanceLevel === "Critical") {
    return "🔴 Critical";
  }

  if (news.importanceLevel === "Notable") {
    return "🟡 Notable";
  }

  return "🟢 Standard";
}

export function NewsCard({ news, mode = "default" }: NewsCardProps) {
  const primaryCategory = categoriesBySlug[news.categorySlugs[0]];
  const tone = accentClasses(primaryCategory?.accent ?? "neutral");
  const breaking = mode === "breaking" || news.breaking;
  const accentBorderColor = breaking
    ? "var(--accent-amber)"
    : primaryCategory?.accent === "green"
      ? "var(--accent-green)"
      : primaryCategory?.accent === "red"
        ? "var(--accent-red)"
        : primaryCategory?.accent === "amber"
          ? "var(--accent-amber)"
          : primaryCategory?.accent === "purple"
            ? "var(--accent-purple)"
            : primaryCategory?.accent === "blue"
              ? "var(--accent-blue)"
              : "var(--text-tertiary)";

  return (
    <article
      id={news.slug}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[rgba(18,18,26,0.9)] p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-hover)]",
        breaking && "hover:shadow-[0_0_20px_rgba(255,184,77,0.12)]",
      )}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: accentBorderColor }} />

      <div className="space-y-4 pl-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {breaking ? (
              <span className="inline-flex items-center rounded-full border border-[rgba(255,184,77,0.25)] bg-[rgba(255,184,77,0.12)] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--accent-amber)]">
                BREAKING
              </span>
            ) : (
              <CategoryPill categorySlug={news.categorySlugs[0]} />
            )}
          </div>
          <div className="flex items-center gap-2">
            <BookmarkButton slug={news.slug} />
            <ShareButton path={`/news#${news.slug}`} title={news.headline} text={news.shortSummary} />
          </div>
        </div>

        <div className="space-y-2">
          <h3
            className={cn(
              "font-[family-name:var(--font-display)] font-semibold tracking-tight text-[var(--text-primary)]",
              mode === "compact" ? "line-clamp-2 text-lg" : "text-xl",
            )}
          >
            {news.headline}
          </h3>
          {mode !== "compact" ? (
            <p className="line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">{news.summary}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {news.companySlugs.map((companySlug) => (
            <CompanyBadge key={`${news.slug}-${companySlug}`} companySlug={companySlug} />
          ))}
          <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
            {formatRelativeTime(news.publishedAt, seedNow)}
          </span>
        </div>

        {mode === "default" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {news.categorySlugs.slice(1).map((categorySlug) => (
                <CategoryPill key={`${news.slug}-${categorySlug}`} categorySlug={categorySlug} />
              ))}
              {news.tagSlugs.slice(0, 2).map((tagSlug) => (
                <TagPill key={`${news.slug}-${tagSlug}`} tagSlug={tagSlug} />
              ))}
            </div>
            <p className="text-sm italic text-[var(--text-secondary)]">Why it matters: {news.whyItMatters}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[var(--text-primary)]">
                {importanceCopy(news)}
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[var(--text-secondary)]">
                {news.confidenceLevel}
              </span>
            </div>
          </div>
        ) : null}

        {mode !== "default" ? (
          <div className="flex items-center justify-between gap-3 text-xs text-[var(--text-tertiary)]">
            <span>{news.sourceName}</span>
            <span>{formatTimestamp(news.publishedAt)}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 text-xs text-[var(--text-tertiary)]">
            <span>{news.sourceName}</span>
            <span>{formatTimestamp(news.publishedAt)}</span>
          </div>
        )}
      </div>
    </article>
  );
}
