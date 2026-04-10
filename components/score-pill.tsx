import { accentClasses, cn, formatScore, getChangeTone, hasMeaningfulMetric } from "@/lib/utils";

type ScorePillProps = {
  value: number;
  className?: string;
  compact?: boolean;
  label?: string;
};

export function ScorePill({ value, className, compact = false, label }: ScorePillProps) {
  if (!hasMeaningfulMetric(value)) {
    return null;
  }

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
      {label ? <span className="mr-2 opacity-80">{label}</span> : null}
      {formatScore(value)}
    </span>
  );
}
