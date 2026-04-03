import { accentClasses, cn, formatScore, getChangeTone } from "@/lib/utils";

type ScorePillProps = {
  value: number;
  className?: string;
  compact?: boolean;
};

export function ScorePill({ value, className, compact = false }: ScorePillProps) {
  const tone = getChangeTone(value);
  const toneClasses = accentClasses(tone);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 font-[family-name:var(--font-mono)] font-medium tracking-[0.08em]",
        compact ? "text-[11px]" : "text-xs",
        toneClasses.bg,
        toneClasses.border,
        toneClasses.text,
        className,
      )}
    >
      {formatScore(value)}
    </span>
  );
}
