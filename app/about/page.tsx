import { SectionHeader } from "@/components/section-header";

const trackItems = [
  "Major model launches and product releases",
  "Funding rounds, partnerships, and infrastructure expansion",
  "Research claims, benchmark stories, and enterprise rollout signals",
  "Policy, regulation, leadership changes, and notable setbacks",
];

const audienceItems = [
  "People who follow AI but do not want to read five feeds to understand one day",
  "Developers, investors, founders, and operators looking for clean signal",
  "Readers who care less about hype cycles and more about momentum with context",
];

export default function AboutPage() {
  return (
    <div className="relative z-10 mx-auto max-w-3xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-10">
        <SectionHeader
          label="ABOUT"
          title="The AI Company Tracker follows the companies shaping the AI era."
          subtitle="It turns the daily flood of launches, research claims, partnerships, funding rounds, and policy shifts into a readable scoreboard people can actually follow."
          tone="purple"
          align="center"
        />

        <div className="space-y-8 rounded-3xl border border-[var(--border)] bg-[rgba(18,18,26,0.88)] p-8 backdrop-blur-sm">
          <div className="space-y-4">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
              What we track
            </h2>
            <ul className="space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
              {trackItems.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
              How momentum scoring works
            </h2>
            <p className="text-sm leading-7 text-[var(--text-secondary)]">
              Momentum scoring turns recent events into a readable ranking. Big model launches, product releases,
              partnerships, funding, infrastructure expansion, and research wins add points; controversies, delays, and
              regulatory setbacks subtract them. Scores decay over time so the board reflects what is happening now, not
              what mattered last quarter.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
              Who this is for
            </h2>
            <ul className="space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
              {audienceItems.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
              Contact / feedback
            </h2>
            <p className="text-sm leading-7 text-[var(--text-secondary)]">
              Feedback channel coming soon. For now, this placeholder stands in for future reader notes, corrections,
              source suggestions, and partnership inquiries.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
