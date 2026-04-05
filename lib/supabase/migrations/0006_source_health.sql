create table if not exists public.source_health (
  source_id text primary key,
  source_name text not null,
  source_kind text not null,
  priority int not null,
  reliability numeric not null,
  last_fetched_at timestamptz,
  last_success_at timestamptz,
  last_status text not null default 'idle' check (last_status in ('idle', 'success', 'error')),
  last_error text,
  last_items_returned int not null default 0,
  last_items_stored int not null default 0,
  last_new_item_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_source_health_last_fetched_at on public.source_health(last_fetched_at desc);
create index if not exists idx_source_health_last_new_item_at on public.source_health(last_new_item_at desc);
