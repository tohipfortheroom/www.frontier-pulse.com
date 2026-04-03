import Link from "next/link";

import { companiesBySlug, type LaunchCardData } from "@/lib/seed/data";
import { accentClasses, formatCompactDate } from "@/lib/utils";

type LaunchCardProps = {
  launch: LaunchCardData;
};

export function LaunchCard({ launch }: LaunchCardProps) {
  const company = companiesBySlug[launch.companySlug];
  const tone = accentClasses(launch.accent);

  return (
    <Link
      href={`/companies/${company.slug}`}
      className={`group flex h-full min-w-[300px] snap-start flex-col rounded-2xl border border-[var(--border)] bg-[rgba(18,18,26,0.9)] p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--bg-card-hover)] ${tone.glow}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex rounded-full border px-2.5 py-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] ${tone.bg} ${tone.border} ${tone.text}`}>
          {launch.type}
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
          {formatCompactDate(launch.launchDate)}
        </span>
      </div>
      <div className="mt-5 space-y-3">
        <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
          {launch.name}
        </h3>
        <p className="text-sm text-[var(--text-tertiary)]">{company.name}</p>
        <p className="line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">{launch.description}</p>
      </div>
    </Link>
  );
}
