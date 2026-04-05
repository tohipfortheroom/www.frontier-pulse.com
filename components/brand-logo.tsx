import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  variant?: "full" | "wordmark" | "icon";
  alt?: string;
  className?: string;
  priority?: boolean;
};

function PulseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 352 352"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0 text-[var(--text-primary)]", className)}
    >
      <circle cx="176" cy="176" r="164" stroke="currentColor" strokeWidth="2.8" opacity="0.14" />
      <polyline
        points="12,176 96,176 130,80 166,260 202,130 224,212 250,176 340,176"
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.96"
      />
    </svg>
  );
}

function Wordmark() {
  return (
    <span className="inline-flex items-baseline gap-[0.28em] leading-none">
      <span className="font-[family-name:var(--font-display)] font-semibold uppercase tracking-[0.12em] text-[var(--text-primary)]">
        Frontier
      </span>
      <span className="font-[family-name:var(--font-display)] font-light uppercase tracking-[0.14em] text-[var(--wordmark-muted)]">
        Pulse
      </span>
    </span>
  );
}

function accessibilityProps(alt: string) {
  if (!alt) {
    return {
      "aria-hidden": true,
    } as const;
  }

  return {
    role: "img",
    "aria-label": alt,
  } as const;
}

export function BrandLogo({
  variant = "wordmark",
  alt = BRAND_NAME,
  className,
}: BrandLogoProps) {
  if (variant === "icon") {
    return (
      <span {...accessibilityProps(alt)} className={cn("inline-flex items-center justify-center", className)}>
        <PulseIcon className="size-full" />
      </span>
    );
  }

  if (variant === "full") {
    return (
      <span
        {...accessibilityProps(alt)}
        className={cn("inline-flex items-center gap-[0.55em] leading-none text-[var(--text-primary)]", className)}
      >
        <PulseIcon className="size-[1.18em]" />
        <Wordmark />
      </span>
    );
  }

  return (
    <span
      {...accessibilityProps(alt)}
      className={cn("inline-flex items-center leading-none text-[var(--text-primary)]", className)}
    >
      <Wordmark />
    </span>
  );
}
