import { getLeaderboardData, getRecentMomentumEventsData } from "@/lib/db/queries";
import { companiesBySlug } from "@/lib/seed/data";
import { formatScore } from "@/lib/utils";

import { LeaderboardTable } from "@/components/leaderboard-table";
import { SectionHeader } from "@/components/section-header";
import { Collapsible } from "@/components/ui/collapsible";

const eventWeights = [
  { label: "Major model release", delta: "+10" },
  { label: "Major product launch", delta: "+8" },
  { label: "Enterprise partnership", delta: "+7" },
  { label: "Funding round", delta: "+6" },
  { label: "Infrastructure expansion", delta: "+6" },
  { label: "Research breakthrough", delta: "+5" },
  { label: "Benchmark claim", delta: "+3" },
  { label: "Executive change", delta: "+3" },
  { label: "Controversy", delta: "-4" },
  { label: "Failed/delayed launch", delta: "-5" },
  { label: "Regulatory setback", delta: "-6" },
];

export default async function LeaderboardPage() {
  const [leaderboard, recentEvents] = await Promise.all([getLeaderboardData(), getRecentMomentumEventsData()]);

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-8">
        <SectionHeader
          label="LEADERBOARD"
          title="The full AI race ranking"
          subtitle="Momentum scores are based on weighted recent events with time decay. Every movement on the board maps back to specific news, launches, partnerships, or setbacks."
          tone="blue"
        />
        <LeaderboardTable rows={leaderboard} mode="full" />
      </section>

      <section className="fade-slide-up mt-16 space-y-8" style={{ animationDelay: "0.08s" }}>
        <SectionHeader
          label="WHAT MOVED THE BOARD"
          title="Recent scoring events"
          tone="amber"
        />
        <div className="grid gap-5 md:grid-cols-2">
          {recentEvents.map((event) => {
            const company = companiesBySlug[event.companySlug];

            return (
              <div
                key={`${event.companySlug}-${event.eventType}-${event.headline}`}
                className="rounded-2xl border border-[var(--border)] bg-[rgba(18,18,26,0.88)] p-5 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: company.color }} />
                    <span className="font-medium text-[var(--text-primary)]">{company.name}</span>
                  </div>
                  <span
                    className={
                      event.scoreDelta >= 0
                        ? "font-[family-name:var(--font-mono)] text-sm text-[var(--accent-green)]"
                        : "font-[family-name:var(--font-mono)] text-sm text-[var(--accent-red)]"
                    }
                  >
                    {formatScore(event.scoreDelta)}
                  </span>
                </div>
                <p className="mt-4 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--text-primary)]">
                  {event.eventType}
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{event.headline}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{event.explanation}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="fade-slide-up mt-16" style={{ animationDelay: "0.14s" }}>
        <Collapsible title="How scoring works">
          <div className="grid gap-3 md:grid-cols-2">
            {eventWeights.map((weight) => (
              <div
                key={weight.label}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[rgba(10,10,15,0.5)] px-4 py-3"
              >
                <span>{weight.label}</span>
                <span className="font-[family-name:var(--font-mono)] text-[var(--text-primary)]">{weight.delta}</span>
              </div>
            ))}
          </div>
          <p className="mt-5">
            Scores decay over time, with roughly 10% of an event&apos;s impact fading each day. `score_change_24h` is the
            current score minus the score 24 hours ago, and `score_change_7d` is the current score minus the score 7
            days ago. Every score change is tied to a specific recent event rather than a black-box ranking rule.
          </p>
        </Collapsible>
      </section>
    </div>
  );
}
