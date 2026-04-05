create table if not exists public.story_similarities (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.news_items(id) on delete cascade,
  similar_story_id uuid not null references public.news_items(id) on delete cascade,
  similarity numeric not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (story_id, similar_story_id),
  check (story_id <> similar_story_id)
);

create index if not exists idx_story_similarities_story_id
on public.story_similarities(story_id);

create index if not exists idx_story_similarities_similar_story_id
on public.story_similarities(similar_story_id);
