alter table public.daily_digests
add column if not exists top_story_slugs text[] not null default '{}',
add column if not exists watch_next text[] not null default '{}';
