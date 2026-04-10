import Link from "next/link";
import type { Metadata } from "next";

import { TRACKED_COMPANY_COUNT, trackedCompanies } from "@/lib/company-registry";
import { SectionHeader } from "@/components/section-header";
import { BRAND_DESCRIPTION, BRAND_NAME } from "@/lib/brand";
import { sourceRegistry } from "@/lib/ingestion/pipeline";
import { EVENT_WEIGHTS } from "@/lib/scoring/momentum";

const audienceItems = [
  "People who follow AI but do not want to read five separate feeds to understand one day.",
  "Developers, investors, founders, and operators who want competitive context instead of random headlines.",
  "Readers who care more about momentum, distribution, and execution than hype cycles.",
];

const faqItems = [
  {
    question: "How often is data updated?",
    answer: "Priority checks run every 15 minutes and the broader ingestion pass runs every 30 minutes, so the tracker stays current without pretending every rumor matters.",
  },
  {
    question: "How is importance scored?",
    answer: "Importance blends source quality, company relevance, event type, timing, and whether a story implies a real strategic move rather than a recycled claim.",
  },
  {
    question: "Is the data biased?",
    answer: "Yes, in the sense that source selection is editorial. Frontier Pulse prefers official company channels and credible public reporting, then makes the scoring rules transparent so readers can judge the model.",
  },
  {
    question: "Can I suggest a company to track?",
    answer: "Not through a formal workflow yet, but the product is designed to add more companies once coverage and source quality justify it.",
  },
  {
    question: "Can I get an API?",
    answer: "Not yet. The current focus is making the editorial product sharper before opening a public data surface.",
  },
];

const decaySeries = Array.from({ length: 31 }, (_, day) => ({
  day,
  score: Number((10 * Math.pow(0.9, day)).toFixed(2)),
}));

const decayPolyline = decaySeries
  .map(({ day, score }) => `${(day / 30) * 320},${148 - (score / 10) * 120}`)
  .join(" ");

export const metadata: Metadata = {
  title: "About",
  description: `Learn how ${BRAND_NAME} approaches AI competitive intelligence, momentum scoring, source selection, and update cadence.`,
};

export default function AboutPage() {
  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-10">
        <SectionHeader
          label="ABOUT"
          title={`${BRAND_NAME} turns the AI race into a readable competitive brief.`}
          subtitle={BRAND_DESCRIPTION}
          tone="purple"
          align="center"
        />

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="surface-card rounded-3xl border border-[var(--border)] p-8 backdrop-blur-sm">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
              What Frontier Pulse tracks
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              The product watches the companies shaping the AI race across launches, infrastructure expansion,
              partnerships, funding, policy moves, leadership changes, and research claims. The goal is not to cover
              everything. The goal is to cover the moves that change competitive position.
            </p>
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              Frontier Pulse currently tracks {TRACKED_COMPANY_COUNT} companies across the editorial surface, with the
              ranking board showing the top 10 momentum positions when score data is current.
            </p>
            <ul className="mt-6 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
              <li>Major model launches and product releases with real downstream impact.</li>
              <li>Funding, partnerships, and infrastructure buildout that change distribution or capacity.</li>
              <li>Research claims, benchmark narratives, and enterprise rollout signals.</li>
              <li>Policy, regulation, leadership changes, controversies, and setbacks.</li>
            </ul>
          </div>

          <div className="surface-card rounded-3xl border border-[var(--border)] p-8 backdrop-blur-sm">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
              Who it&apos;s for
            </h2>
            <ul className="mt-6 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
              {audienceItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="surface-card rounded-3xl border border-[var(--border)] p-8 backdrop-blur-sm">
            <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--accent-blue)]">
              Momentum Scoring
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
              Explainable scores, not black boxes
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              Every company score is the sum of recent events. Bigger strategic moves carry more weight, and each event
              decays by 10% per day so the board reflects current momentum rather than stale reputation.
            </p>

            <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)]">
              <table className="w-full text-left text-sm">
                <thead className="surface-subtle font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                  <tr>
                    <th className="px-4 py-3">Event Type</th>
                    <th className="px-4 py-3">Base Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(EVENT_WEIGHTS).map(([eventType, weight], index) => (
                    <tr
                      key={eventType}
                      className={index % 2 === 0 ? "bg-[var(--surface-subtle)]" : ""}
                    >
                      <td className="px-4 py-3 text-[var(--text-primary)]">{eventType}</td>
                      <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-[var(--text-secondary)]">
                        {weight > 0 ? `+${weight}` : weight}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="surface-card rounded-3xl border border-[var(--border)] p-8 backdrop-blur-sm">
            <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--accent-purple)]">
              Time Decay
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
              How a +10 event fades over 30 days
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              A major model release matters most right away, then gradually contributes less each day. That keeps the
              ranking responsive to what happened this week, not what happened last quarter.
            </p>

            <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-inline)] p-5">
              <svg viewBox="0 0 320 160" className="h-44 w-full" aria-label="Decay curve over 30 days">
                <line x1="0" y1="148" x2="320" y2="148" stroke="var(--border)" strokeWidth="1" />
                <line x1="12" y1="8" x2="12" y2="148" stroke="var(--border)" strokeWidth="1" />
                <polyline fill="none" stroke="var(--accent-blue)" strokeWidth="3" points={decayPolyline} />
                {decaySeries.filter((point) => point.day % 5 === 0).map((point) => (
                  <g key={point.day}>
                    <circle
                      cx={(point.day / 30) * 320}
                      cy={148 - (point.score / 10) * 120}
                      r="3.5"
                      fill="var(--accent-blue)"
                    />
                    <text
                      x={(point.day / 30) * 320}
                      y="158"
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--text-tertiary)"
                    >
                      {point.day}d
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] p-4 text-sm leading-7 text-[var(--text-secondary)]">
              Example: if Anthropic ships a major model today, that +10 boost is worth about +9 tomorrow, +5.9 after
              five days, and +0.4 after 30 days.
            </div>
          </div>
        </section>

        <section id="sources" className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div className="surface-card rounded-3xl border border-[var(--border)] p-8 backdrop-blur-sm">
            <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--accent-green)]">
              Data Sources
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
              Official feeds first, public discussion second
            </h2>
            <div className="mt-6 grid gap-3">
              {sourceRegistry.map((source) => (
                <div key={source.id} className="surface-subtle rounded-2xl border border-[var(--border)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{source.name}</p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {source.kind.toUpperCase()} source {source.companyHint ? `· ${source.companyHint}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full border border-[var(--border)] px-3 py-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                      Reliability {(source.reliability * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card rounded-3xl border border-[var(--border)] p-8 backdrop-blur-sm">
            <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--accent-amber)]">
              Live Status
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
              Health and cadence
            </h2>
            <ul className="mt-6 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
              <li>Main ingestion runs every 30 minutes.</li>
              <li>Priority checks run every 15 minutes for faster critical coverage.</li>
              <li>Health status is available through the public endpoint for live operational visibility.</li>
            </ul>
            <Link
              href="/api/health"
              className="mt-6 inline-flex items-center gap-2 text-sm text-[var(--accent-blue)] transition-colors hover:text-[var(--text-primary)]"
            >
              <span>Open health endpoint</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section className="surface-card rounded-3xl border border-[var(--border)] p-8 backdrop-blur-sm">
          <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--accent-purple)]">
            Tracked Companies
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
            The companies currently on the board
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {trackedCompanies.map((company) => (
              <Link
                key={company.slug}
                href={`/companies/${company.slug}`}
                className="surface-subtle rounded-2xl border border-[var(--border)] p-4 transition-colors duration-200 hover:border-[var(--border-hover)]"
              >
                <div className="flex items-center gap-3">
                  <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: company.color }} />
                  <span className="font-semibold text-[var(--text-primary)]">{company.name}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{company.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section id="faq" className="surface-card rounded-3xl border border-[var(--border)] p-8 backdrop-blur-sm">
          <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--accent-blue)]">
            FAQ
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
            Common questions
          </h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {faqItems.map((item) => (
              <div key={item.question} className="surface-subtle rounded-2xl border border-[var(--border)] p-5">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
