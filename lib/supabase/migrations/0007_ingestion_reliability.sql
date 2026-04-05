alter table public.news_items
  add column if not exists canonical_url text,
  add column if not exists title_fingerprint text,
  add column if not exists last_seen_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.news_items
set canonical_url = coalesce(canonical_url, source_url),
    last_seen_at = coalesce(last_seen_at, ingested_at),
    updated_at = coalesce(updated_at, ingested_at)
where canonical_url is null
   or last_seen_at is null
   or updated_at is null;

create unique index if not exists idx_news_items_canonical_url_unique
  on public.news_items(canonical_url)
  where canonical_url is not null;

create index if not exists idx_news_items_title_fingerprint_published_at
  on public.news_items(title_fingerprint, published_at desc);

create index if not exists idx_news_items_last_seen_at
  on public.news_items(last_seen_at desc);

drop trigger if exists news_items_set_updated_at on public.news_items;

create trigger news_items_set_updated_at
before update on public.news_items
for each row
execute function public.set_updated_at();

alter table public.source_health
  add column if not exists last_checked_at timestamptz,
  add column if not exists last_succeeded_at timestamptz,
  add column if not exists last_failed_at timestamptz,
  add column if not exists status text not null default 'idle'
    check (status in ('idle', 'running', 'live', 'delayed', 'degraded', 'stale', 'error')),
  add column if not exists failure_reason text,
  add column if not exists consecutive_failures int not null default 0,
  add column if not exists latest_item_published_at timestamptz,
  add column if not exists last_duration_ms int,
  add column if not exists items_fetched int not null default 0,
  add column if not exists items_inserted int not null default 0,
  add column if not exists items_updated int not null default 0,
  add column if not exists duplicates_filtered int not null default 0,
  add column if not exists invalid_rejected int not null default 0,
  add column if not exists old_rejected int not null default 0;

update public.source_health
set last_checked_at = coalesce(last_checked_at, last_fetched_at),
    last_succeeded_at = coalesce(last_succeeded_at, last_success_at),
    last_failed_at = coalesce(last_failed_at, case when last_status = 'error' then last_fetched_at else null end),
    status = case
      when status is not null and status <> 'idle' then status
      when last_status = 'success' then 'live'
      when last_status = 'error' then 'error'
      else 'idle'
    end,
    failure_reason = coalesce(failure_reason, last_error),
    latest_item_published_at = coalesce(latest_item_published_at, last_new_item_at),
    items_fetched = coalesce(items_fetched, last_items_returned, 0),
    items_inserted = coalesce(items_inserted, last_items_stored, 0)
where true;

create index if not exists idx_source_health_last_checked_at
  on public.source_health(last_checked_at desc);

create index if not exists idx_source_health_status
  on public.source_health(status);

create table if not exists public.pipeline_state (
  pipeline_name text primary key,
  last_attempted_at timestamptz,
  last_succeeded_at timestamptz,
  last_full_success_at timestamptz,
  last_partial_success_at timestamptz,
  current_status text not null default 'idle'
    check (current_status in ('idle', 'running', 'live', 'delayed', 'degraded', 'stale', 'error')),
  current_status_reason text,
  consecutive_failures int not null default 0,
  active_run_id uuid,
  active_run_started_at timestamptz,
  lock_owner text,
  lock_acquired_at timestamptz,
  lock_expires_at timestamptz,
  last_run_duration_ms int,
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists pipeline_state_set_updated_at on public.pipeline_state;

create trigger pipeline_state_set_updated_at
before update on public.pipeline_state
for each row
execute function public.set_updated_at();

create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  pipeline_name text not null,
  trigger_kind text not null,
  target_scope text not null,
  status text not null
    check (status in ('running', 'success', 'partial_success', 'error', 'skipped')),
  status_reason text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  duration_ms int,
  source_count int not null default 0,
  source_success_count int not null default 0,
  source_failure_count int not null default 0,
  fetched_count int not null default 0,
  normalized_count int not null default 0,
  inserted_count int not null default 0,
  updated_count int not null default 0,
  duplicates_filtered int not null default 0,
  invalid_rejected int not null default 0,
  old_rejected int not null default 0,
  error_count int not null default 0,
  error_summary text[],
  dry_run boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ingestion_runs_pipeline_started_at
  on public.ingestion_runs(pipeline_name, started_at desc);

create index if not exists idx_ingestion_runs_status
  on public.ingestion_runs(status, started_at desc);

create table if not exists public.ingestion_run_sources (
  run_id uuid not null references public.ingestion_runs(id) on delete cascade,
  source_id text not null,
  source_name text not null,
  source_kind text not null,
  priority int not null,
  reliability numeric not null,
  status text not null
    check (status in ('success', 'partial_success', 'error', 'skipped')),
  attempted_at timestamptz not null,
  completed_at timestamptz not null,
  duration_ms int not null default 0,
  items_fetched int not null default 0,
  accepted_count int not null default 0,
  inserted_count int not null default 0,
  updated_count int not null default 0,
  duplicates_filtered int not null default 0,
  invalid_rejected int not null default 0,
  old_rejected int not null default 0,
  latest_item_published_at timestamptz,
  error_message text,
  primary key (run_id, source_id)
);

create index if not exists idx_ingestion_run_sources_source_attempted_at
  on public.ingestion_run_sources(source_id, attempted_at desc);

create or replace function public.acquire_pipeline_lock(
  p_pipeline_name text,
  p_owner text,
  p_run_id uuid,
  p_ttl_seconds int default 900
)
returns boolean
language plpgsql
as $$
declare
  now_utc timestamptz := timezone('utc', now());
begin
  insert into public.pipeline_state (
    pipeline_name,
    current_status,
    current_status_reason,
    consecutive_failures
  )
  values (
    p_pipeline_name,
    'idle',
    'Awaiting ingestion.',
    0
  )
  on conflict (pipeline_name) do nothing;

  update public.pipeline_state
  set active_run_id = p_run_id,
      active_run_started_at = now_utc,
      lock_owner = p_owner,
      lock_acquired_at = now_utc,
      lock_expires_at = now_utc + make_interval(secs => greatest(p_ttl_seconds, 60)),
      current_status = 'running',
      current_status_reason = 'Ingestion run in progress.'
  where pipeline_name = p_pipeline_name
    and (
      lock_owner is null
      or lock_expires_at is null
      or lock_expires_at <= now_utc
      or lock_owner = p_owner
    );

  return found;
end;
$$;

create or replace function public.release_pipeline_lock(
  p_pipeline_name text,
  p_owner text
)
returns boolean
language plpgsql
as $$
begin
  update public.pipeline_state
  set active_run_id = null,
      active_run_started_at = null,
      lock_owner = null,
      lock_acquired_at = null,
      lock_expires_at = null
  where pipeline_name = p_pipeline_name
    and (lock_owner = p_owner or p_owner is null);

  return found;
end;
$$;
