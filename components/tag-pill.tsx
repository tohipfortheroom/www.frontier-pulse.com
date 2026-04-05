import { categoriesBySlug, tagsBySlug } from "@/lib/seed/data";
import { accentClasses, cn } from "@/lib/utils";

export function CategoryPill({
  categorySlug,
  className,
}: {
  categorySlug: string;
  className?: string;
}) {
  const category = categoriesBySlug[categorySlug];
  const toneClasses = accentClasses(category?.accent ?? "neutral");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em]",
        toneClasses.bg,
        toneClasses.border,
        toneClasses.text,
        className,
      )}
    >
      {category?.name ?? categorySlug}
    </span>
  );
}

export function TagPill({
  tagSlug,
  className,
}: {
  tagSlug: string;
  className?: string;
}) {
  const tag = tagsBySlug[tagSlug];

  return (
    <span
      className={cn(
        "surface-subtle inline-flex items-center rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]",
        className,
      )}
    >
      {tag?.name ?? tagSlug}
    </span>
  );
}
