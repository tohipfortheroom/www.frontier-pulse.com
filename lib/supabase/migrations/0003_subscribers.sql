create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  subscribed_at timestamptz not null default timezone('utc', now()),
  confirmed boolean not null default false,
  unsubscribe_token text not null unique
);

create index if not exists idx_subscribers_email on public.subscribers(email);
