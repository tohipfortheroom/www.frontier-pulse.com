# Frontier Pulse — Setup Guide

## 1. Supabase Project
- Create a free Supabase project at [https://supabase.com](https://supabase.com)
- Run all migration files in `lib/supabase/migrations/` in order (`0001_`, `0002_`, and so on)
- Copy your project URL, anon key, and service role key

## 2. Environment Variables
Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=generate-a-random-secret-here
SUMMARIZER_API_KEY=your-openai-or-anthropic-key
SUMMARIZER_MODEL=gpt-4o-mini
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:you@example.com
ADMIN_ENABLED=true
```

## 3. Install Dependencies

```bash
npm install
```

## 4. Seed the Database

```bash
npm run seed
```

## 5. Run Ingestion Manually

```bash
npm run ingest
```

Or call the cron endpoint directly:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/ingest
```

## 6. Run the App Locally

```bash
npm run dev
```

Helpful URLs during setup:
- `/news`
- `/admin`
- `/api/health`

## 7. Deploy to Vercel
- Push the repo to GitHub
- Import the project into Vercel
- Add all environment variables from `.env.local`
- The cron schedule in `vercel.json` will keep ingestion running automatically

## 8. Alternative: External Cron
If you are not using Vercel, configure an external cron service to call:

- `GET /api/cron/ingest`
- `GET /api/cron/ingest-priority`

Use this header on each request:

```text
Authorization: Bearer {CRON_SECRET}
```
