import { cn } from "@/lib/utils";
import { getCompanyInitials, getCompanyLogoUrl } from "@/lib/company-logo";
import type { CompanyProfile } from "@/lib/seed/data";

type CompanyLogoProps = {
  company: Pick<CompanyProfile, "name" | "shortName" | "color" | "websiteUrl" | "logoUrl">;
  className?: string;
  imageClassName?: string;
  initialsClassName?: string;
};

export function CompanyLogo({ company, className, imageClassName, initialsClassName }: CompanyLogoProps) {
  const logoUrl = getCompanyLogoUrl(company);
  const initials = getCompanyInitials(company.shortName || company.name);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]",
        className,
      )}
      style={{ boxShadow: `inset 0 0 0 1px ${company.color}22` }}
      aria-hidden="true"
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${company.name} logo`}
          className={cn("h-full w-full object-contain p-2", imageClassName)}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          className={cn("font-[family-name:var(--font-mono)] text-sm uppercase tracking-[0.14em]", initialsClassName)}
          style={{ color: company.color }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
