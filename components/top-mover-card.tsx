import Link from "next/link";
import { Sparkles, TrendingDown, TrendingUp } from "lucide-react";

import { companiesBySlug, type TopMover } from "@/lib/seed/data";
import { accentClasses, formatScore } from "@/lib/utils";

import { TrendSparkline } from "@/components/trend-sparkline";

type TopMoverCardProps = {
  mover: TopMover;
};

export function TopMoverCard({ mover }: TopMoverCardProps) {
  const company = companiesBySlug[mover.companySlug];
  const tone = accentClasses(mover.accent);
  const chartColor =
    mover.accent === "red"
      ? "var(--accent-red)"
      : mover.accent === "purple"
        ? "var(--accent-purple)"
        : "var(--accent-green)";
  const Icon = mover.accent === "red" ? TrendingDown : mover.accent === "purple" ? Sparkles : TrendingUp;

  return (
    <Link
      href={`/companies/${mover.companySlug}`}
      className="surface-card group block cursor-pointer rounded-2xl border border-[var(--border)] p-6 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--shadow-soft)]"
    >
      <div className={`mb-6 h-1 w-full rounded-full ${tone.bg}`} />
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <span className={`font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] ${tone.text}`}>
            {mover.label}
          </span>
          <div className="flex items-center gap-3">
            <Icon className={`h-4 w-4 transition-all duration-300 group-hover:scale-110 group-hover:animate-pulse ${tone.text}`} />
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: company.color }} />
          </div>
        </div>
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
            {company.name}
          </h3>
          <p className={`mt-2 font-[family-name:var(--font-mono)] text-3xl ${tone.text}`}>
            {formatScore(mover.delta)}
          </p>
        </div>
        <p className="text-sm leading-6 text-[var(--text-secondary)]">{mover.reason}</p>
        <TrendSparkline data={mover.chart} color={chartColor} variant="area" height={88} />
      </div>
    </Link>
  );
}
