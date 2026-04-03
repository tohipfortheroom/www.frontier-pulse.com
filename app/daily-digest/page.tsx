import { format } from "date-fns";

import { getDailyDigestData } from "@/lib/db/queries";
import { companiesBySlug } from "@/lib/seed/data";

import { DailyDigestBlock } from "@/components/daily-digest-block";
import { SectionHeader } from "@/components/section-header";

export default async function DailyDigestPage() {
  const { digest, topStories, biggestWinnerMomentum, biggestLoserMomentum, mostImportantStory } =
    await getDailyDigestData();
  const winner = companiesBySlug[digest.biggestWinnerCompanySlug];
  const loser = companiesBySlug[digest.biggestLoserCompanySlug];

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-8">
        <SectionHeader
          label="DAILY DIGEST"
          title={format(new Date(digest.date), "EEEE, MMMM d, yyyy")}
          subtitle={digest.summary}
          tone="blue"
        />

        <div className="grid gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-[rgba(0,230,138,0.24)] bg-[rgba(0,230,138,0.08)] p-6">
            <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--accent-green)]">
              Biggest Winner
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
              {winner.name}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{biggestWinnerMomentum?.keyDriver}</p>
          </div>
          <div className="rounded-2xl border border-[rgba(255,77,106,0.24)] bg-[rgba(255,77,106,0.08)] p-6">
            <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--accent-red)]">
              Biggest Loser
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
              {loser.name}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{biggestLoserMomentum?.keyDriver}</p>
          </div>
          <div className="rounded-2xl border border-[rgba(77,159,255,0.24)] bg-[rgba(77,159,255,0.08)] p-6">
            <p className="font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--accent-blue)]">
              Most Important Launch
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
              {mostImportantStory.headline}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{mostImportantStory.whyItMatters}</p>
          </div>
        </div>
      </section>

      <section className="fade-slide-up mt-16 space-y-8" style={{ animationDelay: "0.08s" }}>
        <SectionHeader label="TOP 10 STORIES" title="The day in order" tone="amber" />
        <div className="grid gap-5">
          {topStories.map((item, index) => (
            <DailyDigestBlock key={item.slug} index={index + 1} item={item} />
          ))}
        </div>
      </section>

      <section className="fade-slide-up mt-16 space-y-8" style={{ animationDelay: "0.14s" }}>
        <SectionHeader label="WHAT TO WATCH NEXT" title="Forward-looking signals" tone="purple" />
        <div className="grid gap-5 md:grid-cols-3">
          {digest.watchNext.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-[var(--border)] bg-[rgba(18,18,26,0.88)] p-6 backdrop-blur-sm"
            >
              <p className="text-sm leading-7 text-[var(--text-secondary)]">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
