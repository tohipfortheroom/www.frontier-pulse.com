import Link from "next/link";
import type { CSSProperties } from "react";

import { companiesBySlug, type LaunchCardData } from "@/lib/seed/data";
import { accentClasses, formatCompactDate } from "@/lib/utils";

type LaunchCardProps = {
  launch: LaunchCardData;
};

export function LaunchCard({ launch }: LaunchCardProps) {
  const company = companiesBySlug[launch.companySlug];
  const tone = accentClasses(launch.accent);
  const accentGlow =
    launch.accent === "green"
      ? "0 8px 32px var(--accent-green-glow)"
      : launch.accent === "amber"
        ? "0 8px 32px var(--accent-amber-glow)"
        : launch.accent === "purple"
          ? "0 8px 32px var(--accent-purple-glow)"
          : "0 8px 32px var(--accent-blue-glow)";

  return (
    <Link
      href={`/companies/${company.slug}`}
      style={{ "--card-glow": accentGlow } as CSSProperties}
      className={`surface-card group flex h-full min-w-[300px] snap-start flex-col rounded-2xl border border-[var(--border)] p-5 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--card-glow)] ${tone.glow}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] transition-transform duration-300 group-hover:scale-105 ${tone.bg} ${tone.border} ${tone.text}`}
        >
          {launch.type}
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
          {formatCompactDate(launch.launchDate)}
        </span>
      </div>
      <div className="mt-5 space-y-3">
        <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)] transition-colors duration-300 group-hover:text-[var(--text-primary)]">
          {launch.name}
        </h3>
        <p className="text-sm text-[var(--text-tertiary)]">{company.name}</p>
        <p className="line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">{launch.description}</p>
      </div>
    </Link>
  );
}
