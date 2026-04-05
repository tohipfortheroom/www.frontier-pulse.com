import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type CollapsibleProps = {
  title: string;
  className?: string;
  children: React.ReactNode;
};

export function Collapsible({ title, className, children }: CollapsibleProps) {
  return (
    <details
      className={cn(
        "surface-card group rounded-2xl border border-[var(--border)] p-6 backdrop-blur-sm",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
        <span className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--text-primary)]">
          {title}
        </span>
        <ChevronDown className="h-5 w-5 text-[var(--text-tertiary)] transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="mt-5 text-sm leading-7 text-[var(--text-secondary)]">{children}</div>
    </details>
  );
}
