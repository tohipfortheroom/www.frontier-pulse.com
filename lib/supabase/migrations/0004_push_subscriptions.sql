create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_push_subscriptions_endpoint on public.push_subscriptions(endpoint);
