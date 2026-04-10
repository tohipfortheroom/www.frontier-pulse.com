# AGENTS.md — Frontier Pulse

You are improving an existing live Next.js website: https://frontier-pulse.com
Hosted on Vercel. Data layer is Supabase.

You are NOT redesigning this site. The design, layout, colors, fonts, and component structure stay as they are. Your job is to fix what's broken, tighten what's sloppy, and make the existing product feel credible and launch-ready.

Frontier Pulse is an AI industry intelligence site. Its core value:
**"Frontier Pulse turns the AI race into a readable, explainable momentum scoreboard."**

---

## Phase 0 — Codebase Discovery (do this FIRST)

Before making any changes, map the project.

1. List the top-level directory structure.
2. Confirm the Next.js version, app router vs pages router, and rendering strategy (SSR/SSG/ISR).
3. Identify the Supabase client setup: where is the client initialized, what tables/views are queried, are there any edge functions or RPC calls.
4. List all page routes and their source files.
5. List shared layout components (header, footer, nav) and where they're rendered.
6. Identify the components responsible for: hero section, leaderboard, company pages, daily digest, article/summary cards.
7. Identify any data-fetching patterns: server components, `getServerSideProps`, `getStaticProps`, client-side `useEffect`, React Query, SWR, etc.
8. Check for any environment variables referenced (NEXT_PUBLIC_SUPABASE_URL, etc.) to understand the data connection.

**Output:** Write findings to `CODEBASE_MAP.md` in the project root. Reference this for all subsequent work.

---

## Constraints — Read Before Every Task

### Do NOT:
- Change the visual design, color scheme, fonts, or layout structure
- Add new pages or product surfaces unless fixing a dead route
- Add user accounts, auth, watchlists, paywalls, or pricing
- Add onboarding flows, modals, or growth hacks
- Rearrange the order of existing homepage sections (unless a section is literally duplicated)
- Swap CSS frameworks or component libraries
- Refactor working code for style preferences
- Replace the Supabase data layer
- Use placeholder data, fake numbers, or Lorem Ipsum in production views

### Do:
- Fix broken data rendering (nulls, zeros, truncation, malformed text)
- Hide components gracefully when data is missing rather than showing broken UI
- Fix duplicate DOM elements (double headers, double footers, etc.)
- Tighten editorial copy in place
- Add trust signals (timestamps, scoring explainer) using the existing design language
- Fix loading states that never resolve
- Fix hydration errors and console warnings
- Ensure all routes work

---

## Phase 1 — Fix Credibility-Breaking Issues

**Goal:** Eliminate everything that makes the site feel broken or fake.

### Task 1.1: Fix broken data states

Search all components for patterns where data is rendered without null/empty/zero checks. Fix each one:

- **Zero or null metrics:** If any hero stat, score, count, or rank renders as `0`, `null`, `undefined`, or empty string — hide that element entirely. Do not render zeros in prominent stats when content exists elsewhere on the site. Check the Supabase queries to understand whether the issue is a bad query, missing data, or missing null check in the component.
- **Truncated summaries:** Find every article/summary card component. If text is cut off mid-sentence (no terminal punctuation), fix the truncation logic to cut at the last complete sentence. No ellipsis fragments. No dangling words.
- **Malformed digest text:** Find the daily digest component/page. If content is stitched from multiple Supabase rows or API responses, verify each section renders as clean prose. Fix any visible joins, duplicate sentences, or garbled transitions.
- **Broken loading states:** Find all loading/skeleton/spinner states. Each must either resolve to real content or be removed (render nothing if the Supabase query fails or returns empty). No permanent "Loading…" text in production.
- **Broken routes:** Visit every route defined in the app. If any returns a 404 or renders empty, either fix the data fetch or remove the link from navigation.

**Acceptance criteria:**
- No visible zeros in hero/stat areas when the underlying Supabase tables contain real data.
- Every card summary ends with a complete sentence and period.
- No permanent loading/skeleton UI visible after data fetch completes or fails.
- Every nav link resolves to a working page with content.

### Task 1.2: Fix duplicate layout chrome

Check if header, footer, or nav renders more than once on any page. Common Next.js causes:
- Root layout AND page-level layout both rendering the same shell component
- Nested layout.tsx files both including header/footer
- A page component importing and rendering header/footer when the layout already does

Fix: ensure exactly one `<header>` and one `<footer>` in the DOM on every route.

**Acceptance criteria:**
- On every route, inspect the rendered DOM. Only one header and one footer element exist.

### Task 1.3: Standardize timestamps

Find every place a date or time is displayed. Apply consistent formatting:

- Recent (< 24h): "2h ago", "14h ago"
- Recent (1-7 days): "Yesterday", "3 days ago"
- Older: "Mar 15, 2026"
- Freshness labels: Add "Last updated: [relative time]" to: leaderboard page header, daily digest page header, and site footer. Pull the actual timestamp from Supabase (e.g., the most recent `created_at` or `updated_at` from the relevant table).
- If no reliable timestamp exists for a section, do not fabricate one. Omit it.

**Acceptance criteria:**
- No raw ISO strings or inconsistent date formats visible anywhere on the site.
- Leaderboard and digest pages show a "Last updated" line.

---

## Phase 2 — Improve Homepage Content (Without Redesigning)

**Goal:** Make the existing homepage sections clearer and more scannable. Do not rearrange or redesign — fix content and data issues within the existing structure.

### Task 2.1: Fix hero section

- If the hero shows stats/metrics, apply the null/zero hiding from Task 1.1.
- If the hero headline or subline is generic, tighten it. It should communicate "AI competitive intelligence / momentum tracking" not "AI news."
- Example headline: "The AI Race, Scored and Explained."
- Example subline: "Frontier Pulse tracks momentum across the companies shaping AI — with transparent scoring, daily digests, and no hype."
- Do not change the hero's layout, size, background, or visual treatment. Only fix the text and data.

### Task 2.2: Add scoring explainer (if not already present)

Check if the site already has a "how scoring works" section anywhere (homepage, about page, FAQ, leaderboard). If it exists, tighten the copy. If it doesn't exist, add a compact explainer in the most natural location within the existing homepage layout — such as near the leaderboard preview or on the leaderboard page itself.

The explainer should contain 4-6 concise points:
- Scores reflect weighted real-world events (launches, partnerships, funding, breakthroughs, policy moves)
- Recent events are weighted more heavily than older ones
- Signal decays over time so rankings reflect current momentum, not historical legacy
- Negative events (lawsuits, outages, safety incidents) reduce scores
- Sources are weighted by credibility — official announcements and major publications count more
- Scores refresh on a regular cadence (state the actual cadence if you can determine it from the codebase or Supabase refresh logic; otherwise say "regularly")

Style this using the site's existing card/section patterns. Match the current design language exactly.

**Acceptance criteria:**
- A scoring explainer exists somewhere accessible on the site (homepage or leaderboard page).
- It contains specific, concrete statements — not vague hand-waving.
- It uses the site's existing visual style.

---

## Phase 3 — Improve Leaderboard Page

**Goal:** Make the leaderboard feel more authoritative without changing its design.

### Task 3.1: Fix leaderboard data display

- Every company row must show a real score. If a score is null/zero, hide that row.
- If a score change / delta is available in the data, display it with a directional indicator (▲/▼ or +/−). Use the site's existing green/red color conventions. If no delta data exists, don't fake it — omit the indicator.
- Add "Last updated" timestamp to the page header (from Supabase data).
- If the leaderboard already has a "top driver" or "reason" column, ensure every entry is a complete sentence. If it doesn't have one and the data exists in Supabase, add a brief "top catalyst" line per row.

### Task 3.2: Add notable movers (if data supports it)

Check if Supabase has historical score data that would let you calculate biggest movers. If yes, add a small "Notable Movers" section (2-3 items) above or below the main table using the site's existing card style. Each item: company name, direction + magnitude, one-sentence explanation.

If the data doesn't support this, skip it entirely. Do not fabricate movement data.

**Acceptance criteria:**
- No null/zero scores visible in the leaderboard.
- Timestamp visible on the page.
- All text in the leaderboard is complete sentences (no fragments).

---

## Phase 4 — Improve Company Pages

**Goal:** Make each company page feel like a compact analyst brief using the existing page template.

### Task 4.1: Fix company page content

For each company page, verify and fix:

- **Score display:** Current momentum score is visible and non-zero. If zero/null, show a graceful "Score pending" or hide the score widget.
- **Description:** If the company description is generic ("a leading technology company"), rewrite it to be specific to their AI position. One sentence, specific. Example: "Anthropic builds frontier AI systems with a focus on safety research, competing directly with OpenAI on model capability." Do not write marketing copy — write analyst-style positioning.
- **Recent events/catalysts:** If the page shows recent events, ensure each summary follows the editorial pattern: what happened → why it matters. No filler. No fragments. If events are empty, hide the section.
- **Empty sections:** Any section (risks, timeline, catalysts) that renders with a visible header but no content should be hidden entirely. No "No data available" placeholders.

**Acceptance criteria:**
- No company page shows a zero score without explanation.
- No empty sections with visible headers.
- Every company description is specific to that company's AI position (not generic).
- Every event summary is a complete thought (what happened + why it matters).

---

## Phase 5 — Editorial Copy Pass

**Goal:** Tighten all text so it sounds like intelligence analysis, not a tech blog.

### Task 5.1: Rewrite weak summaries

Audit all rendered text across homepage, leaderboard, company pages, daily digest, about/FAQ pages.

**Find and rewrite any text matching these anti-patterns:**
- Generic filler: "This is important because it could change things."
- Vague momentum language: "This matters because it changes how the market reads momentum."
- Buzzword soup: "leveraging cutting-edge AI to drive transformative impact"
- Applies-to-anyone: "This positions them well for the future."
- Passive hedging: "It remains to be seen whether this will have an impact."

**Replace with copy following this pattern:**
- What happened (specific)
- Why it matters (concrete competitive implication)
- What it signals (positioning or trend)

Example:
- Bad: "OpenAI released a new model, which is significant for the industry."
- Good: "OpenAI's GPT-5 launch resets the capability benchmark — pressuring Anthropic and Google to respond within weeks, not months."

### Task 5.2: Fix positioning language

- **Meta title:** Should include "AI momentum" or "AI competitive intelligence" — not just "AI news."
- **Meta description:** One sentence communicating the product's value prop. Example: "Frontier Pulse scores and explains momentum across the companies shaping the AI race."
- **About page** (if exists): Opening paragraph should position this as AI competitive intelligence, not an AI news aggregator. One short paragraph, analyst tone.
- **Footer tagline** (if exists): Tighten to one sharp line. Example: "Tracking the AI race with transparent scoring."

**Acceptance criteria:**
- No instance of the anti-pattern phrases above remains visible on the site.
- Meta title and description are specific and differentiated.

---

## Phase 6 — Technical Cleanup

**Goal:** Fix console errors, hydration issues, and build warnings.

### Task 6.1: Fix hydration and console errors

- Run `next build` and fix any build errors or warnings your changes introduced.
- Check for React hydration mismatches (common in Next.js with dynamic data). Fix any you find.
- Check for missing `key` props in lists, unhandled promise rejections in data fetches, and missing error boundaries around Supabase queries.

### Task 6.2: Responsive spot-check

Check every page you modified at 375px width (mobile). Fix:
- Any horizontal overflow
- Any text overflowing its container
- Any touch target smaller than 44px

Do not redesign mobile layouts. Just fix breakage.

### Task 6.3: Graceful Supabase failure handling

For every Supabase query in the app, ensure there's error handling:
- If a query fails, the component should render nothing (or a minimal fallback) — not crash the page.
- If a query returns empty results, the component should hide itself — not render an empty container with headers.
- Log errors to console for debugging but don't expose error messages to users.

**Acceptance criteria:**
- `next build` completes without errors.
- No new TypeScript/ESLint errors introduced.
- No hydration warnings in browser console.
- No horizontal scroll on any page at 375px.
- Supabase query failures result in graceful degradation, not broken UI.

---

## Phase 7 — Final QA

### Task 7.1: Smoke test every route

Visit every route in the app. For each, verify:
- Page renders without error
- No console errors related to data fetching or hydration
- No duplicate header/footer
- No stuck loading state
- No zero/null metrics visible (unless appropriately hidden)
- Timestamps present and correctly formatted
- All internal links navigate correctly

### Task 7.2: Write changelog

Write `CHANGELOG.md` in the project root summarizing every change you made, organized by phase. For each change, note:
- What file was modified
- What the issue was
- What you did to fix it

---

## Execution Rules

1. Complete Phase 0 before touching any code.
2. Work through phases sequentially (1 → 7).
3. After each phase, run `next build` to verify you haven't broken anything.
4. If you encounter a data issue in Supabase you cannot fix (missing table, empty data), hide the affected component gracefully and document it in `CHANGELOG.md`.
5. Commit after each phase with a clear message: `Phase 1: Fix broken data states and duplicate layout`
6. Do not change the site's visual design, color scheme, fonts, spacing system, or layout structure.
7. Do not ask clarifying questions. Make the best decision with available information and document your choices in `CHANGELOG.md`.
8. If you're unsure whether a change counts as a "redesign" — it probably does. Skip it.
