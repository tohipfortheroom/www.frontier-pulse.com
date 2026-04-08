import Link from "next/link";
import type { CSSProperties } from "react";

import type { CompanyProfile, MomentumSnapshot } from "@/lib/seed/data";

import { CompanyLogo } from "@/components/company-logo";
import { ScorePill } from "@/components/score-pill";

type CompanyCardProps = {
  company: CompanyProfile;
  activityCount: number;
  momentum?: MomentumSnapshot;
};

export function CompanyCard({ company, activityCount, momentum }: CompanyCardProps) {
  return (
    <article
      style={{ "--company-glow": `0 20px 42px ${company.color}22` } as CSSProperties}
      className="surface-card group rounded-2xl border border-[var(--border)] p-6 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--company-glow)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <CompanyLogo company={company} className="h-14 w-14 rounded-2xl" imageClassName="p-2.5" />
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full border border-[var(--border)]" style={{ backgroundColor: company.color }} />
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
                {company.name}
              </h3>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[var(--text-secondary)]">{company.description}</p>
          </div>
        </div>
        {momentum ? <ScorePill value={momentum.score} /> : null}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="surface-subtle rounded-full border border-[var(--border)] px-3 py-1.5 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
          {activityCount} recent moves
        </span>
        {momentum ? (
          <span className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
            {momentum.trend} 7d trend
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {company.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="surface-subtle inline-flex items-center rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)]"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Link href={`/companies/${company.slug}`} className="flex items-center gap-2 text-sm text-[var(--accent-blue)] transition-transform duration-300 group-hover:translate-x-1">
          <span>Open profile</span>
          <span aria-hidden="true">→</span>
        </Link>
        <Link
          href={`/compare?companies=${company.slug}`}
          className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--accent-blue-border)] hover:text-[var(--text-primary)]"
        >
          Compare
        </Link>
      </div>
    </article>
  );
}
