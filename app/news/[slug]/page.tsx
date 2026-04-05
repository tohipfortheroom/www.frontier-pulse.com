import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { getNewsItemDetailData, getNewsItemsData } from "@/lib/db/queries";
import { accentClasses, cn, formatTimestamp } from "@/lib/utils";

import { BookmarkButton } from "@/components/bookmark-button";
import { CompanyBadge } from "@/components/company-badge";
import { NewsCard } from "@/components/news-card";
import { ReactionBar } from "@/components/reaction-bar";
import { ScrollReveal } from "@/components/scroll-reveal";
import { CategoryPill, TagPill } from "@/components/tag-pill";
import { ShareButton } from "@/components/share-button";

export async function generateStaticParams() {
  const items = await getNewsItemsData();
  return items.map((item) => ({ slug: item.slug }));
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const record = await getNewsItemDetailData(slug);

  if (!record) {
    return {
      title: "Story Not Found",
    };
  }

  return {
    title: record.news.headline,
    description: record.news.summary,
    openGraph: {
      title: record.news.headline,
      description: record.news.summary,
      type: "article",
    },
    twitter: {
      title: record.news.headline,
      description: record.news.summary,
    },
  };
}

function getImpactTone(impactDirection: "positive" | "negative" | "neutral") {
  if (impactDirection === "positive") {
    return "green" as const;
  }

  if (impactDirection === "negative") {
    return "red" as const;
  }

  return "neutral" as const;
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const record = await getNewsItemDetailData(slug);

  if (!record) {
    notFound();
  }

  const { news, relatedStories, moreFromCompany } = record;
  const impactTone = getImpactTone(news.impactDirection);
  const impactClasses = accentClasses(impactTone);
  const importancePercent = Math.max(10, Math.min(100, news.importanceScore * 10));
  const newsArticleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: news.headline,
    datePublished: news.publishedAt,
    description: news.summary,
    author: {
      "@type": "Organization",
      name: "Frontier Pulse",
    },
    publisher: {
      "@type": "Organization",
      name: "Frontier Pulse",
    },
    mainEntityOfPage: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/news/${news.slug}`,
  };

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-5 py-16 lg:py-20">
      <Script
        id={`news-${news.slug}-article-jsonld`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleSchema) }}
      />
      <section className="fade-slide-up space-y-8">
        <div className="space-y-5">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors duration-200 hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to news</span>
          </Link>

          <div className="surface-card rounded-3xl border border-[var(--border)] p-8 backdrop-blur-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                  <a
                    href={news.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-[var(--accent-blue)] transition-colors duration-200 hover:text-[var(--text-primary)]"
                  >
                    <span>{news.sourceName}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <span className="text-[var(--text-tertiary)]">{formatTimestamp(news.publishedAt)}</span>
                </div>

                <h1 className="max-w-4xl font-[family-name:var(--font-display)] text-4xl font-semibold leading-tight tracking-tight text-[var(--text-primary)] sm:text-5xl">
                  {news.headline}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <BookmarkButton slug={news.slug} className="h-10 w-10" />
                <ShareButton path={`/news/${news.slug}`} title={news.headline} text={news.shortSummary} className="shrink-0" />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {news.companySlugs.map((companySlug) => (
                <CompanyBadge key={`${news.slug}-${companySlug}`} companySlug={companySlug} href={`/companies/${companySlug}`} />
              ))}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
              <div className="space-y-6">
                <p className="text-lg leading-8 text-[var(--text-secondary)]">{news.summary}</p>

                <div className="surface-subtle rounded-2xl border border-[var(--border)] p-5">
                  <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                    Why It Matters
                  </p>
                  <p className="mt-3 border-l-2 border-[var(--accent-blue)] pl-4 text-base italic leading-7 text-[var(--text-secondary)]">
                    {news.whyItMatters}
                  </p>
                </div>
              </div>

              <div className="surface-inline space-y-4 rounded-2xl border border-[var(--border)] p-5">
                <div>
                  <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                    Importance Score
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <span className="text-4xl font-semibold text-[var(--text-primary)]">{news.importanceScore}/10</span>
                    <span className="surface-soft rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                      {news.importanceLevel}
                    </span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-blue),var(--accent-purple))]"
                      style={{ width: `${importancePercent}%` }}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                  <div className="surface-subtle rounded-2xl border border-[var(--border)] p-4">
                    <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                      Confidence
                    </p>
                    <p className="mt-2 text-base font-medium text-[var(--text-primary)]">
                      {news.confidenceLevel} ({news.confidenceScore}/10)
                    </p>
                  </div>

                  <div className={cn("rounded-2xl border p-4", impactClasses.bg, impactClasses.border)}>
                    <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                      Impact Direction
                    </p>
                    <p className={cn("mt-2 text-base font-medium capitalize", impactClasses.text)}>{news.impactDirection}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                Categories & Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {news.categorySlugs.map((categorySlug) => (
                  <CategoryPill key={`${news.slug}-${categorySlug}`} categorySlug={categorySlug} />
                ))}
                {news.tagSlugs.map((tagSlug) => (
                  <TagPill key={`${news.slug}-${tagSlug}`} tagSlug={tagSlug} />
                ))}
              </div>
            </div>

            <div className="mt-8">
              <ReactionBar newsItemSlug={news.slug} />
            </div>
          </div>
        </div>
      </section>

      {relatedStories.length > 0 ? (
        <ScrollReveal delay={80}>
          <section className="mt-16 space-y-6">
            <div className="space-y-2">
              <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.14em] text-[var(--accent-purple)]">
                Related Stories
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                Nearby themes in the same news cycle
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {relatedStories.map((item) => (
                <NewsCard key={item.slug} news={item} />
              ))}
            </div>
          </section>
        </ScrollReveal>
      ) : null}

      {moreFromCompany.length > 0 ? (
        <ScrollReveal delay={110}>
          <section className="mt-16 space-y-6">
            <div className="space-y-2">
              <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.14em] text-[var(--accent-blue)]">
                More From Company
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                Recent coverage around the same company set
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {moreFromCompany.map((item: typeof moreFromCompany[number]) => (
                <NewsCard key={item.slug} news={item} />
              ))}
            </div>
          </section>
        </ScrollReveal>
      ) : null}
    </div>
  );
}
