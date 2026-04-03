import { accentClasses, cn, type AccentTone } from "@/lib/utils";

type SectionHeaderProps = {
  label: string;
  title?: string;
  subtitle?: string;
  tone?: AccentTone;
  align?: "left" | "center";
};

export function SectionHeader({
  label,
  title,
  subtitle,
  tone = "blue",
  align = "left",
}: SectionHeaderProps) {
  const toneClasses = accentClasses(tone);

  return (
    <div className={cn("space-y-3", align === "center" && "mx-auto max-w-3xl text-center")}>
      <div
        className={cn(
          "inline-flex items-center gap-2 font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em]",
          toneClasses.text,
        )}
      >
        <span className={cn("h-2 w-2 rounded-full", toneClasses.bg)} />
        <span>{label}</span>
      </div>
      {title ? (
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
          {title}
        </h2>
      ) : null}
      {subtitle ? <p className="max-w-3xl text-base leading-7 text-[var(--text-secondary)]">{subtitle}</p> : null}
    </div>
  );
}
