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
    "relative inline-flex items-center justify-center overflow-hidden rounded-lg font-semibold transition-all duration-300 ease-out before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(circle,var(--button-sheen)_0%,transparent_66%)] before:opacity-0 before:scale-[0.45] before:transition-all before:duration-300 before:content-[''] active:before:scale-100 active:before:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue-ring)] disabled:pointer-events-none disabled:opacity-50";

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--accent-blue)] text-[var(--text-inverse)] shadow-[0_0_28px_var(--accent-blue-glow)] hover:-translate-y-0.5 hover:brightness-110",
    secondary:
      "border border-[var(--accent-blue-border)] bg-transparent text-[var(--accent-blue)] hover:-translate-y-0.5 hover:bg-[var(--accent-blue-soft)]",
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
