alter table public.subscribers
add column if not exists unsubscribed_at timestamptz;

create index if not exists idx_subscribers_unsubscribed_at
on public.subscribers(unsubscribed_at);
