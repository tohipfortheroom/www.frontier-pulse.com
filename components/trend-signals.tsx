import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpDown,
} from "lucide-react";
import { computeTrendSignals, type TrendSignal, type TrendSignalType } from "@/lib/scoring/signals";
import { TrendSparkline } from "@/components/trend-sparkline";

const iconMap: Record<TrendSignalType, typeof TrendingUp> = {
  accelerating: TrendingUp,
  decelerating: TrendingDown,
  reversal: AlertTriangle,
  "biggest-gap": ArrowUpDown,
};

const colorMap: Record<TrendSignalType, string> = {
  accelerating: "var(--accent-green)",
  decelerating: "var(--accent-red)",
  reversal: "var(--accent-amber)",
  "biggest-gap": "var(--accent-purple)",
};

const pillBgMap: Record<TrendSignalType, string> = {
  accelerating: "bg-[var(--accent-green)]/10 text-[var(--accent-green)]",
  decelerating: "bg-[var(--accent-red)]/10 text-[var(--accent-red)]",
  reversal: "bg-[var(--accent-amber)]/10 text-[var(--accent-amber)]",
  "biggest-gap": "bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]",
};

function SignalCard({ signal }: { signal: TrendSignal }) {
  const Icon = iconMap[signal.type];
  const color = colorMap[signal.type];
  const pillClasses = pillBgMap[signal.type];

  return (
    <div className="surface-card rounded-2xl border border-[var(--border)] p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon
            size={18}
            style={{ color }}
            aria-hidden="true"
          />
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${pillClasses}`}
          >
            {signal.companyName}
          </span>
        </div>
      </div>

      <h3 className="mt-3 text-sm font-semibold font-[family-name:var(--font-display)] text-[var(--foreground)]">
        {signal.title}
      </h3>

      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
        {signal.description}
      </p>

      <div className="mt-3">
        <TrendSparkline
          data={signal.sparkline}
          color={color}
          height={36}
        />
      </div>
    </div>
  );
}

export function TrendSignals() {
  const signals = computeTrendSignals();

  if (signals.length === 0) return null;

  return (
    <section aria-label="Trend signals">
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
        {signals.map((signal) => (
          <SignalCard key={`${signal.type}-${signal.companySlug}`} signal={signal} />
        ))}
      </div>
    </section>
  );
}
