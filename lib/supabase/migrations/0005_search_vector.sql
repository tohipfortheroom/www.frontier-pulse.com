alter table public.news_items
add column if not exists search_vector tsvector generated always as (
  setweight(to_tsvector('english', coalesce(headline, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(summary, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(short_summary, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(why_it_matters, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(cleaned_text, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(raw_text, '')), 'D')
) stored;

create index if not exists idx_news_items_search_vector on public.news_items using gin (search_vector);
