import { accentClasses, cn } from "@/lib/utils";

type NewsTickerItemProps = {
  company: string;
  direction: string;
  text: string;
  tone: "green" | "red" | "blue" | "amber" | "purple" | "neutral";
};

export function NewsTickerItem({ company, direction, text, tone }: NewsTickerItemProps) {
  const toneClasses = accentClasses(tone);

  return (
    <div className="flex items-center gap-2 whitespace-nowrap pr-6 font-[family-name:var(--font-mono)] text-[13px] tracking-[0.08em] text-[var(--text-tertiary)]">
      <span className="uppercase text-[var(--text-secondary)]">{company}</span>
      <span className={cn("text-sm", toneClasses.text)}>{direction}</span>
      <span>{text}</span>
      <span className="text-[var(--text-tertiary)]">•</span>
    </div>
  );
}
