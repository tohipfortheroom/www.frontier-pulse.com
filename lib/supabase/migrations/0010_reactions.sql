create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  news_item_id uuid not null references public.news_items(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('fire', 'mind_blown', 'bearish', 'bullish', 'yawn')),
  visitor_id text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_reactions_unique
on public.reactions(news_item_id, reaction_type, visitor_id);

create index if not exists idx_reactions_news_item_id
on public.reactions(news_item_id);
