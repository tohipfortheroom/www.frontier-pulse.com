# Changelog

## Phase 0 — Codebase Discovery

- `CODEBASE_MAP.md`: The project had no consolidated architecture map. Documented the top-level structure, App Router setup, rendering model, Supabase query layer, routes, shared layout ownership, key UI components, and referenced environment variables for the rest of the work.

## Phase 1 — Fix Broken Data States and Duplicate Layout

- `lib/db/queries.ts`, `lib/db/types.ts`: Several pages were vulnerable to null, empty, or partially missing Supabase records. Tightened the query normalization layer so downstream pages receive safer, more consistent data and can fall back cleanly when Supabase is unavailable.
- `lib/utils.ts`: Date, sentence-completion, and display helpers were inconsistent across views. Added shared formatting utilities so summaries end cleanly and timestamps render in one format family instead of raw or mismatched strings.
- `components/news-card.tsx`, `components/daily-digest-block.tsx`, `app/news/[slug]/page.tsx`: News and digest summaries could truncate mid-thought. Updated summary rendering to end on complete sentences instead of clipped fragments.
- `components/hero.tsx`, `components/score-pill.tsx`, `components/company-card.tsx`, `components/leaderboard-table.tsx`, `components/trending-topics-client.tsx`: Prominent stats could surface weak zero/null states. Hid invalid metrics and tightened display guards so credibility-breaking numbers do not render.
- `app/daily-digest/page.tsx`, `components/digest-archive-nav.tsx`, `components/data-freshness-indicator.tsx`, `components/footer.tsx`: Timestamp display was inconsistent and missing in key surfaces. Standardized relative freshness labels and added the required “Last updated” treatment where reliable timestamps existed.
- `app/leaderboard/page.tsx`, `components/leaderboard-command-center.tsx`: The leaderboard shell needed cleaner data-state handling and freshness support. Wired the page to authoritative update timing and removed broken-state presentation.
- `app/companies/[slug]/page.tsx`, `app/compare/page.tsx`, `app/heatmap/page.tsx`, `app/timeline/page.tsx`, `components/compare-page-client.tsx`, `components/interactive-timeline.tsx`, `components/timeline-item.tsx`, `components/global-search.tsx`, `components/news-page-client.tsx`: Several routes depended on optional data without graceful empty handling. Hid empty sections and prevented unresolved loading or malformed content states from leaking into the UI.

## Phase 2 — Improve Homepage Content

- `app/page.tsx`: The homepage copy read too much like a generic AI news site. Tightened the page metadata and section framing so the product reads as AI momentum tracking and competitive intelligence.
- `components/hero.tsx`: The hero needed a sharper value proposition and cleaner metric presentation. Rewrote the headline and supporting copy around “scored and explained” momentum, preserved the existing design, and added a compact scoring explainer in the established homepage style.

## Phase 3 — Improve Leaderboard Authority and Movers

- `components/leaderboard-command-center.tsx`: The leaderboard needed stronger authority signals. Hid rows without credible scores, added directional movement indicators where data existed, normalized catalyst text into complete sentences, surfaced a clear “Last updated” line, and added a small notable-movers treatment when the historical signal supported it.
- `components/leaderboard-command-center.module.css`: Added only the supporting styles needed for the notable-movers and authority treatments while preserving the existing page design.
- `lib/utils.ts`: Extended formatting helpers to support the leaderboard’s movement and freshness displays consistently.

## Phase 4 — Improve Company Pages

- `lib/db/queries.ts`: Company pages could inherit generic database copy even when better curated positioning text existed. Added detection for weak/generic company descriptions and preferred more specific analyst-style fallback copy when available.
- `app/companies/[slug]/page.tsx`: Company pages needed to read more like compact analyst briefs. Default-expanded the recent-news cards so “Why it matters” is visible immediately and aligned the page more closely with the existing analyst-oriented content model.

## Phase 5 — Editorial Copy Pass

- `lib/brand.ts`: The shared product tagline and description leaned too close to “AI news.” Repositioned the brand around AI momentum tracking and explainable competitive intelligence.
- `app/page.tsx`, `app/about/page.tsx`, `app/news/page.tsx`: Tightened metadata and on-page copy so homepage, about, and news surfaces consistently describe Frontier Pulse as an AI race scoreboard rather than a general aggregator.
- `components/footer.tsx`: The footer tagline and description were softened and generalized. Rewrote them into a sharper one-line positioning statement plus more specific product context.
- `app/companies/[slug]/page.tsx`: Renamed a weak recent-news section title to better match the site’s editorial tone.
- `lib/seed/data.ts`: Cleaned a fallback digest narrative line so seeded prose reads like analysis instead of filler.

## Phase 6 — Technical Cleanup

- `components/score-breakdown-chart.tsx`: Recharts was warning during prerender because the chart mounted before a stable client size existed. Added a mount guard and inert placeholder so the chart only renders after client mount, eliminating the width/height warning without changing the visual design.
- `components/compare-page-client.tsx`: Some compare-page controls were under the 44px mobile touch target guidance. Increased the company selector tap targets with minimal class changes and no layout redesign.
- Verification: `npm run build` completed successfully after the Phase 6 fixes. Local builds still log Supabase fetch failures in this environment, but the app now continues to degrade to seed data instead of failing the build.

## Phase 7 — Final QA

- Route smoke test: Checked 56 public routes locally using the sitemap, company pages, and linked news detail pages. Public pages returned successfully and the HTML checks showed one header and one footer per page.
- Link validation: Parsed internal links from the main public pages and confirmed they resolved locally, with one environment-specific exception: `/api/health` returned `503` because local Supabase connectivity was unavailable during the test.
- Build verification: Re-ran `npm run build` after the technical cleanup and confirmed the project still builds successfully.
- `CHANGELOG.md`: Added this phase-by-phase record of modified files, the issues they addressed, and the fixes shipped.

## Notes

- Local Supabase access was unavailable during verification, so database reads logged fetch failures in build and dev. Public pages continued to render through the project’s existing seed-data fallback path, and affected areas were handled with graceful degradation instead of exposing broken UI.
- App Router dev HTML includes loading-boundary references that can surface the string `Loading` in raw source inspection. Those strings were treated as framework artifacts rather than evidence of a user-visible stuck loading state.
