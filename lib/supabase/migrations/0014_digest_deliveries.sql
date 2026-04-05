create table if not exists public.digest_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references public.subscribers(id) on delete set null,
  digest_date date not null,
  email text not null,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_digest_deliveries_digest_date
on public.digest_deliveries(digest_date desc);
