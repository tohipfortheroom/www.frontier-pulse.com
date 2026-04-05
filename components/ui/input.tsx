import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "surface-card h-12 w-full rounded-xl border border-[var(--border)] px-4 text-sm text-[var(--text-primary)] shadow-[inset_0_1px_0_var(--surface-subtle)] outline-none transition-all duration-200 placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-blue-border)] focus:bg-[var(--bg-card-hover)] focus:ring-2 focus:ring-[var(--accent-blue-ring)]",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
