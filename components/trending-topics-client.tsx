"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";

import type { TrendingTag } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

type TrendingTopicsClientProps = {
  topics: TrendingTag[];
};

function trendArrow(trend: TrendingTag["trend"]) {
  if (trend === "up") {
    return { symbol: "\u2191", className: "text-[var(--accent-green)]" };
  }

  if (trend === "down") {
    return { symbol: "\u2193", className: "text-[var(--accent-red)]" };
  }

  return { symbol: "\u2192", className: "text-[var(--text-tertiary)]" };
}

export function TrendingTopicsClient({ topics }: TrendingTopicsClientProps) {
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const maxCount = Math.max(...topics.map((tag) => tag.count), 1);

  return (
    <div className="space-y-8">
      {/* Tag Cloud */}
      <div className="surface-card rounded-3xl border border-[var(--border)] p-8 backdrop-blur-sm">
        <p className="mb-6 font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.14em] text-[var(--accent-purple)]">
          Tag Cloud
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {topics.map((tag) => {
            const fontSize = 14 + (tag.count / maxCount) * 24;

            return (
              <Link
                key={tag.slug}
                href={`/news?tag=${tag.slug}`}
                className="transition-colors duration-200 hover:text-[var(--accent-blue)]"
                style={{
                  fontSize: `${fontSize}px`,
                  color: "var(--text-secondary)",
                  lineHeight: 1.4,
                }}
              >
                {tag.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Ranked List */}
      <div className="surface-card rounded-3xl border border-[var(--border)] p-8 backdrop-blur-sm">
        <p className="mb-6 font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.14em] text-[var(--accent-purple)]">
          Top 20 Tags
        </p>
        <div>
          {topics.map((tag, index) => {
            const isExpanded = expandedSlug === tag.slug;
            const arrow = trendArrow(tag.trend);
            const isLast = index === topics.length - 1;

            return (
              <div
                key={tag.slug}
                className={cn(!isLast && "border-b border-[var(--border)]", "py-4")}
              >
                <button
                  type="button"
                  onClick={() => setExpandedSlug(isExpanded ? null : tag.slug)}
                  className="flex w-full items-center gap-4 text-left"
                >
                  <span className="w-8 shrink-0 font-[family-name:var(--font-mono)] text-sm text-[var(--text-tertiary)]">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">
                    {tag.name}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[var(--border)] px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[11px] text-[var(--text-secondary)]">
                    {tag.count} {tag.count === 1 ? "story" : "stories"}
                  </span>
                  <span className={cn("w-5 text-center font-[family-name:var(--font-mono)] text-sm", arrow.className)}>
                    {arrow.symbol}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
                  )}
                </button>

                {isExpanded && tag.topStories.length > 0 ? (
                  <div className="mt-3 space-y-2 pl-12">
                    {tag.topStories.map((story) => (
                      <div key={story.slug} className="flex items-start gap-3">
                        <div className="flex-1">
                          <Link
                            href={`/news/${story.slug}`}
                            className="text-sm text-[var(--text-primary)] transition-colors duration-200 hover:text-[var(--accent-blue)]"
                          >
                            {story.headline}
                          </Link>
                          <div className="mt-1 flex items-center gap-2">
                            {story.companySlugs[0] ? (
                              <span className="inline-flex items-center rounded-md border border-[var(--border)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                                {story.companySlugs[0]}
                              </span>
                            ) : null}
                            <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--text-tertiary)]">
                              {format(new Date(story.publishedAt), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
