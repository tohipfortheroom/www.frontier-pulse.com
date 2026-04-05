import type { MouseEventHandler } from "react";
import Link from "next/link";

import { companiesBySlug } from "@/lib/seed/data";
import { cn } from "@/lib/utils";

type CompanyBadgeProps = {
  companySlug: string;
  className?: string;
  href?: string;
  onClick?: MouseEventHandler<HTMLElement>;
};

export function CompanyBadge({ companySlug, className, href, onClick }: CompanyBadgeProps) {
  const company = companiesBySlug[companySlug];

  if (!company) {
    return null;
  }

  const badgeClassName = cn(
    "surface-card inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-all duration-200",
    href && "hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]",
    className,
  );

  const content = (
    <>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: company.color }} />
      <span>{company.shortName}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={badgeClassName}>
        {content}
      </Link>
    );
  }

  return (
    <span onClick={onClick} className={badgeClassName}>
      {content}
    </span>
  );
}
