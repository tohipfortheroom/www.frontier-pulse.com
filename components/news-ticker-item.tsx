import { accentClasses, cn } from "@/lib/utils";

type NewsTickerItemProps = {
  company: string;
  direction: string;
  text: string;
  tone: "green" | "red" | "blue" | "amber" | "purple" | "neutral";
  className?: string;
};

export function NewsTickerItem({ company, direction, text, tone, className }: NewsTickerItemProps) {
  const toneClasses = accentClasses(tone);

  return (
    <div
      className={cn(
        "flex items-center gap-2 whitespace-nowrap pr-6 font-[family-name:var(--font-mono)] text-[13px] tracking-[0.08em] text-[var(--text-secondary)]",
        className,
      )}
    >
      <span className="uppercase text-[var(--text-primary)]">{company}</span>
      <span className={cn("text-sm", toneClasses.text)}>{direction}</span>
      <span>{text}</span>
      <span className="text-[var(--text-tertiary)]">•</span>
    </div>
  );
}
