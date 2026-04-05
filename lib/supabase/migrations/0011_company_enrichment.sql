alter table public.companies
add column if not exists enrichment_data jsonb not null default '{}'::jsonb;
