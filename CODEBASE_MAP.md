# CODEBASE_MAP

## Phase 0 Summary

Project: `Frontier Pulse`

Goal of this document: map the current Next.js app before making credibility, data, and QA fixes.

## 1. Top-Level Directory Structure

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
|- screenshots/
|- .env.example
|- .env.local
|- .env.production
|- next.config.ts
|- package.json
|- tsconfig.json
|- vercel.json
|- vitest.config.ts
```

Key folders:

- `app/`: App Router pages, layouts, route handlers, feed endpoints, metadata routes.
- `components/`: shared UI and page-level client/server presentation components.
- `lib/`: Supabase clients, query layer, ingestion pipeline, scoring, email, search, notifications, utilities.
- `public/`: static brand assets and public files.
- `scripts/`: backfill tooling.

## 2. Framework, Router, and Rendering Strategy

- Framework: Next.js `16.2.2`
- React: `19.2.4`
- Router: App Router
- Pages Router: not present
- Root layout: `app/layout.tsx`
- Nested layouts: none found

Rendering strategy is mixed:

- Dynamic SSR via `export const dynamic = "force-dynamic"`:
  - `/`
  - `/news`
  - `/daily-digest`
  - `/timeline`
  - `/heatmap`
  - several API/cron endpoints
- ISR-style revalidation via `export const revalidate = 300`:
  - `/leaderboard`
  - `/companies`
  - `/companies/[slug]`
  - `/news/[slug]`
  - `/trending`
  - `/compare`
- Static metadata objects on simpler pages:
  - `/about`
  - `/bookmarks`
  - `/privacy`
  - `/terms`
  - `/admin`

Static param generation:

- `app/companies/[slug]/page.tsx` uses `generateStaticParams()`
- `app/news/[slug]/page.tsx` uses `generateStaticParams()`

Metadata generation:

- Dynamic `generateMetadata()` is used on the home page, leaderboard, company detail, news detail, daily digest, and timeline pages.

## 3. Supabase Client Setup

Server-side client setup:

- `lib/db/client.ts`
  - `getSupabaseReadClient()`
  - `getSupabaseServiceClient()`
  - `getSupabaseServerClient()`
  - read client uses service role if present, otherwise anon key
  - auth persistence/refresh disabled

Browser-side client setup:

- `lib/db/browser-client.ts`
  - `getSupabaseBrowserClient()`
  - only initializes in the browser when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` exist

Primary query layer:

- `lib/db/queries.ts`
  - central server-side data access layer
  - wraps Supabase reads in `runSupabaseQuery()`
  - uses `react` `cache()` for memoized server fetches
  - falls back to seed data from `lib/seed/data.ts` when Supabase is unavailable or a query fails

## 4. Supabase Tables, Columns, Realtime, and RPC

### Tables queried by the app

Read-heavy tables used by the site:

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
- `daily_digests`

Tables used by app features or operations:

- `subscribers`
- `push_subscriptions`
- `reactions`
- `source_health`
- `pipeline_state`
- `ingestion_runs`
- `ingestion_run_sources`

Notable column-level usage:

- `news_items.search_vector` is used for full-text search in `lib/search/server.ts`
- `momentum_scores.calculated_at` drives score history ordering
- `events.event_date` drives timeline and heatmap
- `daily_digests.digest_date` drives archive lookup

### Realtime subscriptions

Client-side Supabase realtime is used in:

- `components/leaderboard-table.tsx`
  - subscribes to `momentum_scores`
  - refreshes the route on score changes
- `components/leaderboard-command-center.tsx`
  - subscribes to `momentum_scores`
  - refreshes the leaderboard page
- `components/news-page-client.tsx`
  - subscribes to `news_items`
  - tracks pending realtime inserts and refresh flow

### RPC calls

Supabase RPC is used for ingestion locking only:

- `acquire_pipeline_lock`
- `release_pipeline_lock`

These are called from:

- `lib/ingestion/run-state.ts`

### Edge functions / views

- No Supabase Edge Functions are referenced in the application code.
- No SQL views are referenced by the app query layer.
- SQL functions exist in migrations, including:
  - `public.set_updated_at()`
  - `public.acquire_pipeline_lock(...)`
  - `public.release_pipeline_lock(...)`

## 5. Route Map

### User-facing page routes

- `/` -> `app/page.tsx`
- `/leaderboard` -> `app/leaderboard/page.tsx`
- `/companies` -> `app/companies/page.tsx`
- `/companies/[slug]` -> `app/companies/[slug]/page.tsx`
- `/news` -> `app/news/page.tsx`
- `/news/[slug]` -> `app/news/[slug]/page.tsx`
- `/daily-digest` -> `app/daily-digest/page.tsx`
- `/timeline` -> `app/timeline/page.tsx`
- `/trending` -> `app/trending/page.tsx`
- `/heatmap` -> `app/heatmap/page.tsx`
- `/compare` -> `app/compare/page.tsx`
- `/bookmarks` -> `app/bookmarks/page.tsx`
- `/about` -> `app/about/page.tsx`
- `/privacy` -> `app/privacy/page.tsx`
- `/terms` -> `app/terms/page.tsx`
- `/admin` -> `app/admin/page.tsx`

### Feed and metadata routes

- `/feed.xml` -> `app/feed.xml/route.ts`
- `/feed/[company]` -> `app/feed/[company]/route.ts`
- `sitemap.xml` -> `app/sitemap.ts`
- `robots.txt` -> `app/robots.ts`

### API routes

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
- `/api/cron/backfill` -> `app/api/cron/backfill/route.ts`
- `/api/cron/recompute-leaderboard` -> `app/api/cron/recompute-leaderboard/route.ts`
- `/api/cron/send-digest` -> `app/api/cron/send-digest/route.ts`

### Loading and error boundaries

- Global: `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx`
- Companies: `app/companies/loading.tsx`
- Company detail: `app/companies/[slug]/loading.tsx`, `app/companies/[slug]/error.tsx`
- News: `app/news/loading.tsx`
- News detail: `app/news/[slug]/loading.tsx`
- Daily digest: `app/daily-digest/loading.tsx`
- Leaderboard: `app/leaderboard/loading.tsx`
- Compare: `app/compare/loading.tsx`

## 6. Shared Layout Chrome

The shared shell is owned by `app/layout.tsx`.

Rendered globally in the root layout:

- `Navbar` -> `components/navbar.tsx`
- `Footer` -> `components/footer.tsx`
- `KeyboardShortcuts` -> `components/keyboard-shortcuts.tsx`
- `ChatWidget` -> `components/chat-widget.tsx` when `CHAT_ENABLED === "true"`
- `AppProviders` -> `components/app-providers.tsx`

Important note for later duplicate-chrome checks:

- Only one layout file exists.
- Header and footer are currently intended to be rendered once, at the root layout level.

Navbar details:

- Main nav links live in `components/navbar.tsx`
- Includes `DataFreshnessIndicator`, `GlobalSearch`, `BookmarkCountBadge`, `NotificationBell`, `ThemeToggle`

Footer details:

- Footer is in `components/footer.tsx`
- Includes `NewsletterForm`
- Also includes legal/resource links and quick company links

## 7. Components Responsible for Core Product Surfaces

### Hero section

- `components/hero.tsx`
- Rendered from `app/page.tsx`
- Uses:
  - `AnimatedCounter`
  - `BrandLogo`
  - `InteractiveTicker`
  - `HeroScrollCue`

### Homepage leaderboard preview

- `components/leaderboard-table.tsx`
- Rendered from `app/page.tsx` in preview mode

### Full leaderboard page

- `components/leaderboard-command-center.tsx`
- Rendered from `app/leaderboard/page.tsx`
- More editorial/visual command-center treatment than the homepage table

### Company pages

Primary page file:

- `app/companies/[slug]/page.tsx`

Supporting company-detail components used there:

- `NewsCard`
- `ScorePill`
- `TrendSparkline`
- `CategoryDonut` (dynamic import)
- `ScoreBreakdownChart` (dynamic import)
- `ShareButton`
- `SectionHeader`

### Daily digest

- `app/daily-digest/page.tsx`
- `components/daily-digest-block.tsx`
- `components/digest-archive-nav.tsx`

### Article / summary cards

Primary reusable article card:

- `components/news-card.tsx`

Digest-specific summary card:

- `components/daily-digest-block.tsx`

Other related content cards:

- `components/top-mover-card.tsx`
- `components/launch-card.tsx`
- `components/company-card.tsx`

## 8. Data-Fetching Patterns

### Server component data fetching

Most page routes are async server components that call functions from `lib/db/queries.ts`.

Examples:

- `app/page.tsx` -> `getHomePageData()`
- `app/leaderboard/page.tsx` -> `getCompaniesIndexData()`, `getRecentMomentumEventsData()`
- `app/companies/page.tsx` -> `getCompaniesIndexData()`
- `app/companies/[slug]/page.tsx` -> `getCompanyDetailData()`
- `app/news/page.tsx` -> `getNewsItemsData()`, `getCompaniesIndexData()`
- `app/news/[slug]/page.tsx` -> `getNewsItemDetailData()`
- `app/daily-digest/page.tsx` -> `getDailyDigestData()`, `getDailyDigestByDate()`, `getDigestArchiveDates()`
- `app/timeline/page.tsx` -> `getFullTimelineData()`
- `app/trending/page.tsx` -> `getTrendingTopicsData()`
- `app/heatmap/page.tsx` -> `getHeatmapData()`
- `app/compare/page.tsx` -> `getCompaniesIndexData()`, `getNewsItemsData()`

### Client-side interactivity

Client components are used for filtering, search, realtime refresh, local UI state, and browser-only features.

Notable client components:

- `components/news-page-client.tsx`
- `components/companies-index-client.tsx`
- `components/leaderboard-table.tsx`
- `components/leaderboard-command-center.tsx`
- `components/trending-topics-client.tsx`
- `components/timeline-page-client.tsx`
- `components/industry-heatmap.tsx`
- `components/bookmarks-page-client.tsx`

### API-backed client fetching

Client-side fetches go to app route handlers, not directly to external services.

Examples:

- `components/data-freshness-indicator.tsx` -> `/api/health`
- `components/news-page-client.tsx` -> `/api/health`
- global search UI likely goes through `/api/search`

### Dynamic imports

Used for heavier client/chart components and loading placeholders:

- `CategoryDonut`
- `ScoreBreakdownChart`
- `TimelinePageClient`
- `ComparePageClient`
- `TrendingTopicsClient`

### Deprecated Pages Router patterns

- No `getServerSideProps`
- No `getStaticProps`
- No `pages/` router in use

## 9. Query Layer by Surface

### Home page

`getHomePageData()` combines:

- news items
- leaderboard
- launches
- timeline
- top movers
- trending topics
- daily digest
- ticker items

### Leaderboard

`getLeaderboardData()` builds momentum snapshots from:

- `companies`
- `momentum_scores`
- `events`
- `news_items`

`getCompaniesIndexData()` combines:

- company records
- leaderboard results
- related activity counts

### Company detail

`getCompanyDetailData(slug)` combines:

- `companies`
- `company_products`
- `news_items`
- leaderboard data
- `events`

### Daily digest

`getDailyDigestData()` and `getDailyDigestByDate()` combine:

- `daily_digests`
- `companies`
- `news_items`
- leaderboard data

### News index and detail

- `getNewsItemsData()`
- `getNewsItemDetailData(slug)`

### Trending

- `getTrendingTopicsData()` uses recent `news_items` plus tag/category joins

### Heatmap and timeline

- `getHeatmapData()` -> `companies` + `events`
- `getFullTimelineData(days)` -> `companies` + `events` + `news_items`

## 10. Search, Notifications, and Supporting Systems

Search:

- `lib/search/server.ts`
- Supabase full-text search on `news_items.search_vector`
- falls back to seed-data search if Supabase is unavailable

Notifications:

- browser push subscription endpoint: `app/api/notifications/subscribe/route.ts`
- push sending logic: `lib/notifications/web-push.ts`
- client entry: `components/notification-bell.tsx`

Digest email:

- sending logic: `lib/email/digest-sender.ts`
- HTML template: `lib/email/templates/daily-digest.ts`

Ingestion and scoring:

- `lib/ingestion/`
- `lib/scoring/`
- admin entry page: `app/admin/page.tsx`

## 11. Environment Variables Referenced

Site and public URLs:

- `NEXT_PUBLIC_SITE_URL`
- `VERCEL_PROJECT_PRODUCTION_URL`

Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Feature flags / admin:

- `CHAT_ENABLED`
- `ADMIN_ENABLED`
- `NODE_ENV`

Cron and ingestion:

- `CRON_SECRET`
- `SOURCE_ALLOWLIST`
- `BACKFILL_MAX_AGE_HOURS`
- `BACKFILL_SOURCES`
- `SUMMARIZER_DELAY_MS`

LLM / summarization:

- `SUMMARIZER_API_KEY`
- `SUMMARIZER_PROVIDER`
- `SUMMARIZER_MODEL`

Email:

- `RESEND_API_KEY`
- `RESEND_FROM_ADDRESS`

Push notifications:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

## 12. Current Architectural Notes Relevant to Later Phases

- The app already expects graceful degradation and uses seed-data fallbacks widely in `lib/db/queries.ts`.
- The root layout is the single owner of header/footer chrome, which will make duplicate shell checks straightforward.
- The app mixes server-rendered data with client-side realtime refreshes, so hydration and stale-loading bugs may be concentrated in client wrappers such as:
  - `components/news-page-client.tsx`
  - `components/leaderboard-table.tsx`
  - `components/leaderboard-command-center.tsx`
  - `components/data-freshness-indicator.tsx`
- The home page, daily digest, leaderboard, company pages, and news cards all depend on editorial text fields from Supabase and are likely the main surfaces for null handling and truncation fixes.
