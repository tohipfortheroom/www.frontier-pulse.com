import { type NewsItem } from "@/lib/seed/data";

import { CompanyBadge } from "@/components/company-badge";

type DailyDigestBlockProps = {
  index: number;
  item: NewsItem;
};

export function DailyDigestBlock({ index, item }: DailyDigestBlockProps) {
  return (
    <div className="surface-card rounded-2xl border border-[var(--border)] p-5 backdrop-blur-sm">
      <div className="flex items-start gap-4">
        <span className="font-[family-name:var(--font-mono)] text-sm text-[var(--accent-blue)]">
          {index.toString().padStart(2, "0")}
        </span>
        <div className="space-y-3">
          <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
            {item.headline}
          </h3>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">{item.shortSummary}</p>
          <div className="flex flex-wrap gap-2">
            {item.companySlugs.map((companySlug) => (
              <CompanyBadge key={`${item.slug}-${companySlug}`} companySlug={companySlug} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
