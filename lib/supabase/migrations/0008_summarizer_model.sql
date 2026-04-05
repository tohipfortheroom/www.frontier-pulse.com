alter table public.news_items
add column if not exists summarizer_model text;
