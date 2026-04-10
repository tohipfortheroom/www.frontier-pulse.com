import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { NewsletterForm } from "@/components/newsletter-form";
import { getSiteLastUpdatedAt } from "@/lib/db/queries";
import { BRAND_NAME } from "@/lib/brand";
import { companies } from "@/lib/seed/data";
import { formatLastUpdatedLabel } from "@/lib/utils";

export async function Footer() {
  const lastUpdatedAt = await getSiteLastUpdatedAt();
  const lastUpdatedLabel = formatLastUpdatedLabel(lastUpdatedAt);

  return (
    <footer className="surface-card mt-20 border-t border-[var(--border)] py-12">
      <div className="mx-auto max-w-6xl space-y-10 px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <BrandLogo variant="full" alt="" className="text-[18px] sm:text-[20px]" />
            <p className="max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
              {BRAND_NAME} tracks the companies shaping the AI race with explainable momentum scoring and editorial
              context around launches, infrastructure, regulation, and partnerships.
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              Tracking the AI race with transparent scoring.
            </p>
            {lastUpdatedLabel ? (
              <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                {lastUpdatedLabel}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-3">
            <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              Navigate
            </p>
            <div className="grid gap-2 text-sm text-[var(--text-secondary)]">
              <Link href="/" className="transition-colors duration-150 hover:text-[var(--text-primary)]">Home</Link>
              <Link href="/companies" className="transition-colors duration-150 hover:text-[var(--text-primary)]">Companies</Link>
              <Link href="/news" className="transition-colors duration-150 hover:text-[var(--text-primary)]">News</Link>
              <Link href="/leaderboard" className="transition-colors duration-150 hover:text-[var(--text-primary)]">Leaderboard</Link>
              <Link href="/compare" className="transition-colors duration-150 hover:text-[var(--text-primary)]">Compare</Link>
              <Link href="/daily-digest" className="transition-colors duration-150 hover:text-[var(--text-primary)]">Daily Digest</Link>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              Resources
            </p>
            <div className="grid gap-2 text-sm text-[var(--text-secondary)]">
              <Link href="/feed.xml" className="transition-colors duration-150 hover:text-[var(--text-primary)]">Main RSS Feed</Link>
              <Link href="/about" className="transition-colors duration-150 hover:text-[var(--text-primary)]">About</Link>
              <Link href="/about#sources" className="transition-colors duration-150 hover:text-[var(--text-primary)]">Data Sources</Link>
              <Link href="/about#faq" className="transition-colors duration-150 hover:text-[var(--text-primary)]">FAQ</Link>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              Legal
            </p>
            <div className="grid gap-2 text-sm text-[var(--text-secondary)]">
              <Link href="/privacy" className="transition-colors duration-150 hover:text-[var(--text-primary)]">Privacy Policy</Link>
              <Link href="/terms" className="transition-colors duration-150 hover:text-[var(--text-primary)]">Terms</Link>
              <Link href="/bookmarks" className="transition-colors duration-150 hover:text-[var(--text-primary)]">Bookmarks</Link>
            </div>
          </div>

          <div className="space-y-4">
            <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              Connect
            </p>
            <NewsletterForm />
            <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
              <a href="https://x.com" target="_blank" rel="noreferrer" className="transition-colors duration-150 hover:text-[var(--text-primary)]">
                X / Twitter
              </a>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="transition-colors duration-150 hover:text-[var(--text-primary)]">
                GitHub
              </a>
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t border-[var(--border)] pt-6">
          <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            Quick Links
          </p>
          <div className="flex flex-wrap gap-x-2.5 gap-y-2">
            {companies.map((company) => (
              <Link
                key={company.slug}
                href={`/companies/${company.slug}`}
                className="surface-soft rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors duration-150 hover:text-[var(--text-primary)]"
              >
                {company.shortName}
              </Link>
            ))}
          </div>
          <p className="text-sm text-[var(--text-tertiary)]">
            Data sourced from RSS feeds, public APIs, and curated editorial normalization.
          </p>
        </div>
      </div>
    </footer>
  );
}
