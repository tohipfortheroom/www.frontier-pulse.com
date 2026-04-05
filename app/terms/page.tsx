import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "Frontier Pulse terms of use and editorial disclaimer.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 lg:py-20">
      <div className="surface-card rounded-3xl border border-[var(--border)] p-8 backdrop-blur-sm">
        <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--accent-blue)]">
          Terms of Use
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold text-[var(--text-primary)]">
          Editorial product, not investment advice
        </h1>
        <div className="mt-6 space-y-5 text-sm leading-7 text-[var(--text-secondary)]">
          <p>
            Frontier Pulse is provided as-is for informational purposes. Rankings, summaries, momentum scores, and
            strategic interpretations are editorial tools, not financial, legal, or investment advice.
          </p>
          <p>
            News is sourced from public feeds, public APIs, and internal normalization systems. While the product aims to
            be accurate and timely, delays, omissions, or source errors can happen.
          </p>
          <p>
            By using the site, you agree not to rely on the tracker as the sole basis for any financial or operational
            decision. If you need guaranteed accuracy, consult the original source material directly.
          </p>
        </div>
      </div>
    </div>
  );
}
