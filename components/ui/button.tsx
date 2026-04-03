import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "md" | "sm";

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(77,159,255,0.35)] disabled:pointer-events-none disabled:opacity-50";

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--accent-blue)] text-white shadow-[0_0_28px_rgba(77,159,255,0.16)] hover:-translate-y-0.5 hover:bg-[#66ABFF]",
    secondary:
      "border border-[rgba(77,159,255,0.45)] bg-transparent text-[var(--accent-blue)] hover:-translate-y-0.5 hover:bg-[rgba(77,159,255,0.08)]",
    ghost: "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]",
  };

  const sizeClasses: Record<ButtonSize, string> = {
    md: "px-6 py-3 text-sm",
    sm: "px-4 py-2 text-xs",
  };

  return cn(base, variantClasses[variant], sizeClasses[size], className);
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return <button ref={ref} className={buttonVariants({ variant, size, className })} {...props} />;
  },
);

Button.displayName = "Button";
