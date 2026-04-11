# CODEBASE_MAP

Project: `Frontier Pulse`

Purpose: current codebase map for the live Next.js app before credibility, data, and QA fixes.

## 1. Top-Level Structure

```text
.
|- AGENTS.md
|- README.md
|- SETUP.md
|- app/
|- components/
|- lib/
|- public/
|- scripts/
|- .github/
|- .env.example
|- .env.local
|- .env.production
|- next.config.ts
|- package.json
|- vercel.json
|- vitest.config.ts
```

Key folders:

- `app/`: App Router pages, loading/error boundaries, metadata routes, and API/cron route handlers.
- `components/`: shared presentation and client components for homepage sections, leaderboard, company pages, news cards, chrome, and charts.
- `lib/`: Supabase clients, query layer, ingestion pipeline, scoring, source health, content cleanup, search, notifications, email, and seed fallbacks.
- `scripts/`: manual backfill tooling.
- `.github/workflows/`: scheduler workflow that hits live cron endpoints.

## 2. Framework, Router, and Rendering Strategy

- Framework: Next.js `16.2.2`
- React: `19.2.4`
- Router: App Router
- Pages Router: not present
- Root layout: `app/layout.tsx`
- Nested layouts: none found

Rendering is mixed:

- Dynamic server rendering with `export const dynamic = "force-dynamic"`:
  - `/`
  - `/news`
  - `/daily-digest`
  - `/timeline`
  - `/heatmap`
  - cron and most API routes
- ISR-style revalidation with `export const revalidate = 300`:
  - `/leaderboard`
  - `/companies`
  - `/companies/[slug]`
  - `/news/[slug]`
  - `/trending`
  - `/compare`
- Plain server-rendered/static pages with static metadata:
  - `/about`
  - `/bookmarks`
  - `/privacy`
  - `/terms`
  - `/admin`

Important correction:

- `generateStaticParams()` is not currently used anywhere.
- Dynamic metadata is used on `/`, `/leaderboard`, `/companies/[slug]`, `/news/[slug]`, `/daily-digest`, and `/timeline`.

## 3. Supabase Client Setup

Server-side client setup:

- `lib/db/client.ts`
  - `getSupabaseReadClient()`
  - `getSupabaseServiceClient()`
  - `getSupabaseServerClient()`
  - read client prefers service role if present, otherwise anon key
  - auth persistence and token refresh are disabled

Browser-side client setup:

- `lib/db/browser-client.ts`
  - `getSupabaseBrowserClient()`
  - only initializes in the browser when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` exist

Primary server query layer:

- `lib/db/queries.ts`
  - central data access for pages
  - wraps reads in `runSupabaseQuery()`
  - memoizes many reads with React `cache()`
  - falls back to seed data in `lib/seed/data.ts` if Supabase is unavailable or a query fails

## 4. Supabase Tables, RPC, and Pipeline Touchpoints

Tables queried by the app:

- `companies`
- `company_products`
- `news_items`
- `company_news`
- `categories`
- `tags`
- `news_item_categories`
- `news_item_tags`
- `events`
- `momentum_scores`
- `momentum_score_history`
- `daily_digests`
- `source_health`
- `pipeline_state`
- `ingestion_runs`
- `ingestion_run_sources`
- `subscribers`
- `push_subscriptions`
- `reactions`

Tables written by ingestion / operational flows:

- `news_items`
- `company_news`
- `news_item_categories`
- `news_item_tags`
- `events`
- `momentum_scores`
- `momentum_score_history`
- `daily_digests`
- `source_health`
- `pipeline_state`
- `ingestion_runs`
- `ingestion_run_sources`
- `subscribers`
- `push_subscriptions`
- `reactions`

RPC calls:

- `acquire_pipeline_lock`
- `release_pipeline_lock`

RPC usage:

- `lib/ingestion/run-state.ts`

Supabase Edge Functions:

- none referenced in app code

Supabase views:

- none referenced in app code

## 5. Scheduler and Refresh Pipeline

Live scheduler wiring:

- `.github/workflows/frontier-pulse-scheduler.yml`

Scheduled tasks:

- every 15 minutes: either priority ingest or full ingest depending on minute
- daily at `13:00 UTC`: digest send
- manual workflow dispatch supports:
  - `priority-ingest`
  - `full-ingest`
  - `recompute-leaderboard`
  - `send-digest`
  - `backfill`

Cron endpoints:

- `/api/cron/ingest` -> `app/api/cron/ingest/route.ts`
- `/api/cron/ingest-priority` -> `app/api/cron/ingest-priority/route.ts`
- `/api/cron/recompute-leaderboard` -> `app/api/cron/recompute-leaderboard/route.ts`
- `/api/cron/backfill` -> `app/api/cron/backfill/route.ts`
- `/api/cron/send-digest` -> `app/api/cron/send-digest/route.ts`

Refresh pipeline chain:

1. GitHub Actions scheduler calls a protected cron route.
2. `lib/ingestion/cron.ts` runs ingestion.
3. Successful full ingestion triggers:
   - `recomputeLeaderboardFromNews()` from `lib/ingestion/leaderboard.ts`
   - `generateDailyDigest()` from `lib/ingestion/digest-generator.ts`
4. UI surfaces read from:
   - `news_items` for the live feed
   - `events`, `momentum_scores`, `momentum_score_history` for score surfaces
   - `daily_digests` for digest pages

## 6. Route Map

User-facing routes:

- `/` -> `app/page.tsx`
- `/companies` -> `app/companies/page.tsx`
- `/companies/[slug]` -> `app/companies/[slug]/page.tsx`
- `/news` -> `app/news/page.tsx`
- `/news/[slug]` -> `app/news/[slug]/page.tsx`
- `/leaderboard` -> `app/leaderboard/page.tsx`
- `/daily-digest` -> `app/daily-digest/page.tsx`
- `/timeline` -> `app/timeline/page.tsx`
- `/heatmap` -> `app/heatmap/page.tsx`
- `/trending` -> `app/trending/page.tsx`
- `/compare` -> `app/compare/page.tsx`
- `/bookmarks` -> `app/bookmarks/page.tsx`
- `/about` -> `app/about/page.tsx`
- `/privacy` -> `app/privacy/page.tsx`
- `/terms` -> `app/terms/page.tsx`
- `/admin` -> `app/admin/page.tsx`

Feed and metadata routes:

- `/feed.xml` -> `app/feed.xml/route.ts`
- `/feed/[company]` -> `app/feed/[company]/route.ts`
- `sitemap.xml` -> `app/sitemap.ts`
- `robots.txt` -> `app/robots.ts`
- Open Graph image -> `app/opengraph-image.tsx`

API routes:

- `/api/health` -> `app/api/health/route.ts`
- `/api/search` -> `app/api/search/route.ts`
- `/api/chat` -> `app/api/chat/route.ts`
- `/api/reactions` -> `app/api/reactions/route.ts`
- `/api/subscribe` -> `app/api/subscribe/route.ts`
- `/api/unsubscribe` -> `app/api/unsubscribe/route.ts`
- `/api/notifications/subscribe` -> `app/api/notifications/subscribe/route.ts`
- `/api/admin/ingest` -> `app/api/admin/ingest/route.ts`
- `/api/cron/ingest` -> `app/api/cron/ingest/route.ts`
- `/api/cron/ingest-priority` -> `app/api/cron/ingest-priority/route.ts`
- `/api/cron/recompute-leaderboard` -> `app/api/cron/recompute-leaderboard/route.ts`
- `/api/cron/backfill` -> `app/api/cron/backfill/route.ts`
- `/api/cron/send-digest` -> `app/api/cron/send-digest/route.ts`

Loading and error boundaries:

- global: `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx`
- companies index: `app/companies/loading.tsx`
- company detail: `app/companies/[slug]/loading.tsx`, `app/companies/[slug]/error.tsx`
- news index: `app/news/loading.tsx`
- news detail: `app/news/[slug]/loading.tsx`
- leaderboard: `app/leaderboard/loading.tsx`
- daily digest: `app/daily-digest/loading.tsx`
- compare: `app/compare/loading.tsx`

## 7. Shared Layout Chrome

Global shell is owned by `app/layout.tsx`.

Always rendered there:

- `Navbar` -> `components/navbar.tsx`
- `Footer` -> `components/footer.tsx`
- `KeyboardShortcuts` -> `components/keyboard-shortcuts.tsx`
- `AppProviders` -> `components/app-providers.tsx`
- `ChatWidget` -> `components/chat-widget.tsx` when `CHAT_ENABLED === "true"`

No nested layout currently duplicates chrome, so duplicate header/footer issues would have to come from page-level imports rather than layout nesting.

Chrome details:

- header/nav: `components/navbar.tsx`
  - includes nav links, `DataFreshnessIndicator`, `ThemeToggle`, `GlobalSearch`, `BookmarkCountBadge`, `NotificationBell`, mobile drawer, and the live clock
- footer: `components/footer.tsx`
  - includes newsletter form, social links, legal/resource links, quick links, and footer-level `Last updated`

## 8. Component Ownership by Product Surface

Homepage:

- page composition: `app/page.tsx`
- hero section: `components/hero.tsx`
- animated counters: `components/animated-counter.tsx`
- top ticker: `components/interactive-ticker.tsx`, `components/news-ticker-item.tsx`
- section nav / scroll helpers: `components/section-nav.tsx`, `components/scroll-progress.tsx`, `components/scroll-reveal.tsx`
- shared section framing: `components/section-header.tsx`, `components/module-status-strip.tsx`
- Today in AI / Breaking Moves cards: `components/news-card.tsx`
- leaderboard preview: `components/leaderboard-table.tsx`
- latest launches: `components/launch-card.tsx`
- timeline preview: `components/interactive-timeline.tsx`
- top movers: `components/top-mover-card.tsx`
- trending topics: `components/trending-topics-client.tsx`

Leaderboard:

- page entry: `app/leaderboard/page.tsx`
- main surface: `components/leaderboard-command-center.tsx`
- tabular preview/full leaderboard: `components/leaderboard-table.tsx`
- comparison / momentum history charting inside command center: Recharts-based UI in `components/leaderboard-command-center.tsx`
- older standalone chart component also exists: `components/momentum-history-chart.tsx`

Company pages:

- page entry: `app/companies/[slug]/page.tsx`
- recent events/news cards: `components/news-card.tsx`
- score pill and sparkline: `components/score-pill.tsx`, `components/trend-sparkline.tsx`
- category donut: `components/category-donut.tsx`
- score breakdown chart: `components/score-breakdown-chart.tsx`

Daily digest:

- page entry: `app/daily-digest/page.tsx`
- archive navigation: `components/digest-archive-nav.tsx`
- digest story blocks: `components/daily-digest-block.tsx`

News and article cards:

- primary story/article card component: `components/news-card.tsx`
- news index client/filter UI: `components/news-page-client.tsx`
- detail page: `app/news/[slug]/page.tsx`

Heatmap:

- page entry: `app/heatmap/page.tsx`
- visualization: `components/industry-heatmap.tsx`

Timeline:

- page entry: `app/timeline/page.tsx`
- interactive client UI: `components/timeline-page-client.tsx`
- item rendering: `components/timeline-item.tsx`

Compare:

- page entry: `app/compare/page.tsx`
- comparison client UI: `components/compare-page-client.tsx`

Companies index:

- page entry: `app/companies/page.tsx`
- client UI: `components/companies-index-client.tsx`
- card rendering: `components/company-card.tsx`

## 9. Data Fetching Patterns

Server data loading:

- page components call async query helpers from `lib/db/queries.ts`
- query helpers are mostly wrapped in React `cache()`
- fallback seed data is used when Supabase is unavailable or a query fails

Client-side realtime / interactivity:

- `components/leaderboard-table.tsx`
  - optional Supabase realtime subscription to `momentum_scores`
- `components/leaderboard-command-center.tsx`
  - Supabase realtime subscription to `momentum_scores`
- `components/news-page-client.tsx`
  - Supabase realtime subscription to `news_items`
- `components/navbar.tsx`
  - client clock via `useEffect`
- chart and filter UIs use client components and local state

No Pages Router data APIs in use:

- no `getServerSideProps`
- no `getStaticProps`

Search:

- server-side search logic lives in `lib/search/server.ts`
- queries `news_items.search_vector`

## 10. Query Helpers That Matter for This Bug Set

Core row fetchers in `lib/db/queries.ts`:

- `getNewsRows()`
- `getEventRows()`
- `getMomentumRows()`
- `getMomentumHistoryRows()`
- `getDailyDigestRows()`

Derived surface loaders:

- `getHomePageData()`
- `getLeaderboardData()`
- `getCompaniesIndexData()`
- `getCompanyDetailData(slug)`
- `getDailyDigestData()`
- `getDailyDigestByDate(date)`
- `getRecentMomentumEventsData()`
- `getHeatmapData()`
- `getFullTimelineData(days)`
- `getLeaderboardRefreshState()`
- `getSiteLastUpdatedAt()`

Key observations:

- homepage "Today in AI" is derived in `getHomePageData()` from `news_items`, using the newest content date in the feed rather than strictly the current calendar date
- homepage launches come from `getLaunchesData()`, which reads `company_products`
- company pages derive score and recent events from `getCompanyDetailData()`
- leaderboard/company/heatmap/timeline all depend on `events` and `momentum_scores` being refreshed after ingestion

## 11. Content Cleanup / Editorial Utilities

Content sanitization:

- `lib/content.ts`
  - `decodeHtmlEntities()`
  - `sanitizeEditorialText()`
  - `buildSentenceExcerpt()`
  - `looksLikeTruncatedText()`
  - `looksLikeCorruptedDigestText()`
  - `isGenericWhyItMatters()`

Date and text formatting:

- `lib/utils.ts`
  - `formatTimestamp()`
  - `formatUpdateTimestamp()`
  - `formatLastUpdatedLabel()`
  - `toCompleteSentence()`
  - `hasMeaningfulMetric()`

Ingestion cleanup:

- RSS decoding and excerpt extraction: `lib/ingestion/sources/rss.ts`
- normalization: `lib/ingestion/normalizer.ts`
- summarization / why-it-matters generation: `lib/ingestion/summarizer.ts`

## 12. Environment Variables Referenced

Site/runtime:

- `NEXT_PUBLIC_SITE_URL`
- `CHAT_ENABLED`
- `NODE_ENV`
- `ADMIN_ENABLED`

Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Cron / ingestion:

- `CRON_SECRET`
- `SOURCE_ALLOWLIST`
- `BACKFILL_MAX_AGE_HOURS`
- `BACKFILL_SOURCES`
- `SUMMARIZER_DELAY_MS`
- `SUMMARIZER_API_KEY`
- `SUMMARIZER_PROVIDER`
- `SUMMARIZER_MODEL`

Notifications:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Email:

- `RESEND_API_KEY`
- `RESEND_FROM_ADDRESS`
- `VERCEL_PROJECT_PRODUCTION_URL`

Footer/social:

- `NEXT_PUBLIC_X_URL`
- `NEXT_PUBLIC_TWITTER_URL`
- `NEXT_PUBLIC_GITHUB_URL`

## 13. Current Architecture Notes to Reference During Fixes

- The app intentionally degrades to seed data when Supabase reads fail. Bugs can appear as stale-but-valid-looking content instead of obvious errors.
- Homepage, leaderboard, company pages, heatmap, and timeline do not all read the same underlying table directly; some derive from `news_items`, while score surfaces derive from `events` and `momentum_scores`.
- Source health is computed from `source_health`, `pipeline_state`, recent run summaries, and latest `news_items` timestamps in `lib/ingestion/source-health.ts`.
- Footer social links are already guarded by `lib/site-config.ts` so root `x.com` / `github.com` values resolve to `null`.
