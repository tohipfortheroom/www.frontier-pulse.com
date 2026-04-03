import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-12 w-full rounded-xl border border-[var(--border)] bg-[rgba(18,18,26,0.88)] px-4 text-sm text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] outline-none transition-all duration-200 placeholder:text-[var(--text-tertiary)] focus:border-[rgba(77,159,255,0.5)] focus:bg-[rgba(26,26,38,0.92)] focus:ring-2 focus:ring-[rgba(77,159,255,0.12)]",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
