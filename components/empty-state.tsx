import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({ title, description, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <div className="surface-card rounded-2xl border border-dashed border-[var(--border-hover)] p-8 text-center backdrop-blur-sm">
      <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
      {actionHref && actionLabel ? (
        <div className="mt-6">
          <Link href={actionHref} className={buttonVariants({ variant: "secondary" })}>
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
