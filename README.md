# Frontier Pulse

Frontier Pulse is a production-style editorial web app for following the AI race in one place. It turns launches, funding, partnerships, benchmark claims, regulation, infrastructure expansion, and leadership moves into a live daily dashboard built for readers who want signal, not noise.

## What’s in the app

- A premium dark-mode homepage with leaderboard, breaking moves, launches, timeline, digest CTA, and newsletter block
- Companies index and full company detail pages
- Searchable news stream with company, category, timeframe, and importance filters
- Full leaderboard with explainable momentum scoring
- Daily digest page with editorial narrative and top stories
- Comparison, timeline, trending, bookmarks, heatmap, and reaction surfaces
- Chat, push notification, and newsletter hooks that stay gated behind env vars when not configured
- About page with product context and scoring explanation

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn-style UI primitives in `components/ui`
- Supabase for database + storage of news, relationships, events, and digests
- Recharts for sparklines and small charts
- `date-fns` for formatting
- Vercel for deployment and scheduled ingestion

## Project structure

```text
app/                    Routes, metadata, loading/error states, cron endpoint
components/             Reusable product components and UI primitives
lib/db/                 Supabase client, query layer, typed view models
lib/ingestion/          Source adapters, normalizer, scorer, summarizer, pipeline
lib/scoring/            Momentum scoring helpers
lib/seed/               Canonical April 2026 editorial seed dataset
lib/supabase/           SQL migration and seed script
public/                 Static assets
```

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Copy the env template:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

4. Run a production build check:

```bash
npm run build
```

## Environment variables

The app will gracefully fall back to the local April 2026 seed dataset when Supabase isn’t configured, but these variables are required for the real data layer and ingestion pipeline:

```bash
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

## Database setup

1. Create a Supabase project.
2. Run the SQL migration in [0001_initial.sql](/Users/dylancallahan/Library/Mobile%20Documents/com~apple~CloudDocs/AI%20News/lib/supabase/migrations/0001_initial.sql).
3. Fill in `.env.local` with your Supabase project values.
4. Seed the database:

```bash
npm run seed
```

The seed script loads:

- 10 companies with full editorial profiles
- 45 April 2026 news items
- momentum events and momentum score history
- category, tag, company-news, and digest relationships

## Data layer notes

- `lib/db/queries.ts` is the single read entry point for the app.
- When Supabase is configured, pages read through that query layer.
- When Supabase is not configured, the query layer falls back to the local seed dataset so the app still renders cleanly.

## Ingestion pipeline

The ingestion system lives in `lib/ingestion/` and is split into:

- `sources/rss.ts`
- `sources/blog-scraper.ts`
- `sources/manual.ts`
- `normalizer.ts`
- `scorer.ts`
- `summarizer.ts`
- `pipeline.ts`
- `cron.ts`

Run it locally with:

```bash
npm run ingest
```

The current registry includes a verified OpenAI news RSS feed plus a manual source slot. Adding new sources is meant to be simple: define a new source file, export `ingest()`, and register it in `sourceRegistry` inside [pipeline.ts](/Users/dylancallahan/Library/Mobile%20Documents/com~apple~CloudDocs/AI%20News/lib/ingestion/pipeline.ts).

## Momentum scoring

Momentum is based on weighted recent events with 10% daily decay:

- Major model release: `+10`
- Major product launch: `+8`
- Enterprise partnership: `+7`
- Funding round: `+6`
- Infrastructure expansion: `+6`
- Research breakthrough: `+5`
- Benchmark claim: `+3`
- Executive change: `+3`
- Controversy: `-4`
- Failed or delayed launch: `-5`
- Regulatory setback: `-6`

The leaderboard shows `score`, `score_change_24h`, `score_change_7d`, and supporting event context.

## Deployment to Vercel

1. Import the repo into Vercel.
2. Add the same env vars from `.env.local` in the Vercel project settings.
3. Deploy normally.
4. Vercel cron is configured in [vercel.json](/Users/dylancallahan/Library/Mobile%20Documents/com~apple~CloudDocs/AI%20News/vercel.json) to:
   - run `/api/cron/ingest-priority` every 5 minutes
   - run `/api/cron/ingest` every 10 minutes
   - run `/api/cron/send-digest` daily at 12:00 UTC
5. Set `CRON_SECRET` so the cron routes can be called securely.
6. Set `NEXT_PUBLIC_SITE_URL` to your live production origin, such as `https://www.frontier-pulse.com`, before shipping.

## Verification commands

```bash
npm run typecheck
npm run build
```

## Current notes

- The UI is fully functional with the seed dataset even before Supabase is connected.
- `npm run seed` and live ingestion require valid Supabase credentials.
- LLM summarization, chat, notifications, and email delivery all stay optional until their env vars are configured.
