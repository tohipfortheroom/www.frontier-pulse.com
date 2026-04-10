import { companiesBySlug, type TimelineEntry } from "@/lib/seed/data";
import { formatTimestamp, toCompleteSentence } from "@/lib/utils";

type TimelineItemProps = {
  entry: TimelineEntry;
  align: "left" | "right";
};

export function TimelineItem({ entry, align }: TimelineItemProps) {
  const company = companiesBySlug[entry.companySlug];

  const content = (
    <div className="surface-card rounded-2xl border border-[var(--border)] p-5 backdrop-blur-sm">
      <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
        {formatTimestamp(entry.timestamp)}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: company.color }} />
        <span className="text-sm font-medium text-[var(--text-secondary)]">{company.name}</span>
      </div>
      <h3 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--text-primary)]">
        {entry.headline}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{toCompleteSentence(entry.detail)}</p>
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)]">
      <div className="hidden lg:block">{align === "left" ? content : null}</div>
      <div className="relative flex justify-center">
        <div
          className="absolute inset-y-0 top-0 w-px"
          style={{ background: "linear-gradient(180deg, var(--accent-blue-border), var(--surface-subtle))" }}
        />
        <div
          className="relative mt-6 h-4 w-4 rounded-full border border-[var(--border)]"
          style={{
            backgroundColor: company.color,
            boxShadow: entry.live ? `0 0 24px ${company.color}` : `0 0 14px ${company.color}55`,
          }}
        >
          {entry.live ? <span className="absolute inset-0 rounded-full animate-[pulse_2s_infinite]" /> : null}
        </div>
      </div>
      <div className="hidden lg:block">{align === "right" ? content : null}</div>
      <div className="lg:hidden">{content}</div>
    </div>
  );
}
