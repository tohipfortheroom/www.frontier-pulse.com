create table if not exists public.power_rankings (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  rankings jsonb not null,
  narrative text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ranking_votes (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  visitor_id text not null,
  top_five text[] not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (week_start, visitor_id)
);

create index if not exists idx_ranking_votes_week_start
on public.ranking_votes(week_start);
