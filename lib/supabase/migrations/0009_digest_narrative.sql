alter table public.daily_digests
add column if not exists narrative text,
add column if not exists headline_of_the_day text,
add column if not exists themes text[] not null default '{}';
