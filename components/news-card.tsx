"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useId, useRef, useState } from "react";

import { categoriesBySlug, seedNow, type NewsItem } from "@/lib/seed/data";
import { cn, formatSmartTime, formatTimestamp } from "@/lib/utils";

import { BookmarkButton } from "@/components/bookmark-button";
import { CompanyBadge } from "@/components/company-badge";
import { ReactionBar } from "@/components/reaction-bar";
import { ShareButton } from "@/components/share-button";
import { CategoryPill, TagPill } from "@/components/tag-pill";

type NewsCardProps = {
  news: NewsItem;
  mode?: "default" | "breaking" | "compact";
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (nextExpanded: boolean, slug: string, element: HTMLElement | null) => void;
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

function getAccentBorderColor(news: NewsItem, mode: NewsCardProps["mode"]) {
  const primaryCategory = categoriesBySlug[news.categorySlugs[0]];
  const breaking = mode === "breaking" || news.breaking;

  if (breaking) {
    return "var(--accent-amber)";
  }

  if (primaryCategory?.accent === "green") {
    return "var(--accent-green)";
  }

  if (primaryCategory?.accent === "red") {
    return "var(--accent-red)";
  }

  if (primaryCategory?.accent === "amber") {
    return "var(--accent-amber)";
  }

  if (primaryCategory?.accent === "purple") {
    return "var(--accent-purple)";
  }

  if (primaryCategory?.accent === "blue") {
    return "var(--accent-blue)";
  }

  return "var(--text-tertiary)";
}

function getAccentGlow(news: NewsItem, mode: NewsCardProps["mode"]) {
  const primaryCategory = categoriesBySlug[news.categorySlugs[0]];
  const breaking = mode === "breaking" || news.breaking;

  if (breaking || primaryCategory?.accent === "amber") {
    return "0 8px 32px var(--accent-amber-glow)";
  }

  if (primaryCategory?.accent === "green") {
    return "0 8px 32px var(--accent-green-glow)";
  }

  if (primaryCategory?.accent === "red") {
    return "0 8px 32px var(--accent-red-glow)";
  }

  if (primaryCategory?.accent === "purple") {
    return "0 8px 32px var(--accent-purple-glow)";
  }

  return "0 8px 32px var(--accent-blue-glow)";
}

export function NewsCard({
  news,
  mode = "default",
  expanded,
  defaultExpanded = false,
  onExpandedChange,
}: NewsCardProps) {
  const articleRef = useRef<HTMLElement | null>(null);
  const expandedContentId = useId();
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const primaryCategory = categoriesBySlug[news.categorySlugs[0]];
  const breaking = mode === "breaking" || news.breaking;
  const accentBorderColor = getAccentBorderColor(news, mode);
  const accentGlow = getAccentGlow(news, mode);
  const isControlled = typeof expanded === "boolean";
  const isExpanded = isControlled ? expanded : internalExpanded;

  const setExpanded = (nextExpanded: boolean) => {
    if (!isControlled) {
      setInternalExpanded(nextExpanded);
    }

    onExpandedChange?.(nextExpanded, news.slug, articleRef.current);
  };

  const toggleExpanded = () => {
    setExpanded(!isExpanded);
  };

  const previewCopy =
    mode === "default"
      ? news.summary
      : news.shortSummary || news.summary;

  return (
    <article
      ref={articleRef}
      id={news.slug}
      style={
        {
          "--card-glow": accentGlow,
          "--card-border-hover": accentBorderColor,
        } as CSSProperties
      }
      className="surface-card group relative overflow-hidden rounded-2xl border border-[var(--border)] p-5 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[color:var(--card-border-hover)] hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--card-glow)]"
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: accentBorderColor }} />

      <div className="space-y-4 pl-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {breaking ? (
              <span className="inline-flex items-center rounded-full border border-[var(--accent-amber-border)] bg-[var(--accent-amber-soft)] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--accent-amber)]">
                BREAKING
              </span>
            ) : (
              <CategoryPill categorySlug={news.categorySlugs[0]} />
            )}
          </div>

          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <BookmarkButton slug={news.slug} />
            <ShareButton path={`/news/${news.slug}`} title={news.headline} text={news.shortSummary} />
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          aria-controls={expandedContentId}
          aria-expanded={isExpanded}
          onClick={toggleExpanded}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggleExpanded();
            }
          }}
          className="cursor-pointer space-y-3 rounded-2xl px-2 py-2 transition-all duration-200 hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue-ring)]"
        >
          <div className="space-y-2">
            <h3
              className={cn(
                "font-[family-name:var(--font-display)] font-semibold tracking-tight text-[var(--text-primary)] transition-colors duration-300 group-hover:text-[var(--text-primary)]",
                mode === "compact" ? "line-clamp-2 text-lg" : "text-xl",
              )}
            >
              <Link
                href={`/news/${news.slug}`}
                onClick={(event) => event.stopPropagation()}
                className="decoration-[var(--accent-blue-border)] underline-offset-4 transition-colors duration-200 hover:text-[var(--text-primary)] hover:underline"
              >
                {news.headline}
              </Link>
            </h3>

            {previewCopy ? (
              <p
                className={cn(
                  "text-sm leading-6 text-[var(--text-secondary)]",
                  mode === "default" && !isExpanded ? "line-clamp-3" : "",
                  mode !== "default" && !isExpanded ? "line-clamp-2" : "",
                )}
              >
                {previewCopy}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {news.companySlugs.map((companySlug) => (
              <CompanyBadge
                key={`${news.slug}-${companySlug}`}
                companySlug={companySlug}
                href={`/companies/${companySlug}`}
                onClick={(event) => event.stopPropagation()}
              />
            ))}
            <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
              {formatSmartTime(news.publishedAt)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 text-xs text-[var(--text-tertiary)]">
            <div className="flex items-center gap-3">
              <span>{news.sourceName}</span>
              <span>{formatTimestamp(news.publishedAt)}</span>
            </div>
            <div className="hidden items-center gap-2 font-[family-name:var(--font-mono)] uppercase tracking-[0.12em] text-[var(--text-tertiary)] sm:flex">
              <span className="transition-colors duration-200 group-hover:text-[var(--text-secondary)]">
                {isExpanded ? "Collapse" : "Click to expand"}
              </span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform duration-300", isExpanded && "rotate-180")}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 sm:hidden">
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              {isExpanded ? "Tap to collapse" : "Tap to expand"}
            </span>
            <ChevronDown className={cn("h-4 w-4 text-[var(--text-tertiary)] transition-transform duration-300", isExpanded && "rotate-180")} />
          </div>
        </div>

        <div
          id={expandedContentId}
          className={cn(
            "grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out",
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div
              className={cn(
                "space-y-4 border-t border-[var(--border)] pt-4 transition-[opacity,transform] duration-200",
                isExpanded
                  ? "translate-y-0 opacity-100 [transition-delay:120ms] ease-out"
                  : "-translate-y-2 opacity-0 [transition-delay:0ms] ease-in",
              )}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="space-y-2">
                <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                  Full Summary
                </p>
                <p className="text-sm leading-7 text-[var(--text-secondary)]">{news.summary}</p>
              </div>

              <div
                className="surface-subtle rounded-2xl border border-[var(--border)] p-4"
                style={{ boxShadow: `inset 3px 0 0 ${accentBorderColor}` }}
              >
                <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                  Why It Matters
                </p>
                <p className="mt-2 text-sm italic leading-7 text-[var(--text-secondary)]">{news.whyItMatters}</p>
              </div>

              <div className="space-y-3">
                <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                  Coverage Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {news.categorySlugs.map((categorySlug) => (
                    <CategoryPill key={`${news.slug}-expanded-${categorySlug}`} categorySlug={categorySlug} />
                  ))}
                  {news.tagSlugs.map((tagSlug) => (
                    <TagPill key={`${news.slug}-expanded-${tagSlug}`} tagSlug={tagSlug} />
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="surface-soft rounded-full border border-[var(--border)] px-3 py-1 text-[var(--text-primary)]">
                  {importanceCopy(news)}
                </span>
                <span className="surface-soft rounded-full border border-[var(--border)] px-3 py-1 text-[var(--text-secondary)]">
                  {news.confidenceLevel}
                </span>
              </div>

              <div className="space-y-3">
                <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                  Related Companies
                </p>
                <div className="flex flex-wrap gap-2">
                  {news.companySlugs.map((companySlug) => (
                    <CompanyBadge
                      key={`${news.slug}-expanded-company-${companySlug}`}
                      companySlug={companySlug}
                      href={`/companies/${companySlug}`}
                      onClick={(event) => event.stopPropagation()}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={news.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-primary)] transition-all duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--surface-soft)]"
                >
                  <span>Read original source</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <Link
                  href={`/news/${news.slug}`}
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-2 text-sm text-[var(--accent-blue)] transition-colors duration-200 hover:text-[var(--text-primary)]"
                >
                  <span>View full article</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>

              <ReactionBar newsItemSlug={news.slug} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
