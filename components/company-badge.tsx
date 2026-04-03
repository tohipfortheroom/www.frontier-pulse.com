import { companiesBySlug } from "@/lib/seed/data";
import { cn } from "@/lib/utils";

type CompanyBadgeProps = {
  companySlug: string;
  className?: string;
};

export function CompanyBadge({ companySlug, className }: CompanyBadgeProps) {
  const company = companiesBySlug[companySlug];

  if (!company) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(18,18,26,0.8)] px-3 py-1.5 text-xs text-[var(--text-secondary)]",
        className,
      )}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: company.color }} />
      <span>{company.shortName}</span>
    </span>
  );
}
