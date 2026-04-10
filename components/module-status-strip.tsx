import { cn } from "@/lib/utils";

type ModuleStatusItem = {
  label: string;
  value: string;
};

export function ModuleStatusStrip({
  items,
  warning,
  className,
}: {
  items: ModuleStatusItem[];
  warning?: string | null;
  className?: string;
}) {
  const visibleItems = items.filter((item) => item.value.trim().length > 0);

  if (visibleItems.length === 0 && !warning) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {visibleItems.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {visibleItems.map((item) => (
            <span
              key={`${item.label}-${item.value}`}
              className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]"
            >
              {item.label}: {item.value}
            </span>
          ))}
        </div>
      ) : null}
      {warning ? <p className="text-sm text-[var(--accent-amber)]">{warning}</p> : null}
    </div>
  );
}
