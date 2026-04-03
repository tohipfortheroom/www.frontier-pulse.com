create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  description text not null,
  overview text not null,
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  why_it_matters text not null,
  valuation_text text,
  website_url text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.company_products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  type text not null,
  description text not null,
  launch_date date,
  created_at timestamptz not null default timezone('utc', now()),
  unique (company_id, name)
);

create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  headline text not null,
  slug text not null unique,
  source_name text not null,
  source_url text not null,
  published_at timestamptz not null,
  ingested_at timestamptz not null default timezone('utc', now()),
  raw_text text,
  cleaned_text text,
  summary text not null,
  short_summary text not null,
  why_it_matters text not null,
  importance_score int not null check (importance_score between 1 and 10),
  confidence_score int not null check (confidence_score between 1 and 10),
  impact_direction text not null check (impact_direction in ('positive', 'negative', 'neutral')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table if not exists public.news_item_categories (
  id uuid primary key default gen_random_uuid(),
  news_item_id uuid not null references public.news_items(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  unique (news_item_id, category_id)
);

create table if not exists public.news_item_tags (
  id uuid primary key default gen_random_uuid(),
  news_item_id uuid not null references public.news_items(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  unique (news_item_id, tag_id)
);

create table if not exists public.company_news (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  news_item_id uuid not null references public.news_items(id) on delete cascade,
  unique (company_id, news_item_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  news_item_id uuid references public.news_items(id) on delete set null,
  event_type text not null,
  score_delta int not null,
  event_date timestamptz not null,
  explanation text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (company_id, news_item_id, event_type, event_date)
);

create table if not exists public.momentum_scores (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  score decimal not null,
  score_change_24h decimal not null,
  score_change_7d decimal not null,
  calculated_at timestamptz not null,
  unique (company_id, calculated_at)
);

create table if not exists public.daily_digests (
  id uuid primary key default gen_random_uuid(),
  digest_date date not null unique,
  title text not null,
  summary text not null,
  biggest_winner_company_id uuid not null references public.companies(id) on delete restrict,
  biggest_loser_company_id uuid not null references public.companies(id) on delete restrict,
  most_important_news_item_id uuid references public.news_items(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_companies_slug on public.companies(slug);
create index if not exists idx_company_products_company_id on public.company_products(company_id);
create index if not exists idx_news_items_published_at on public.news_items(published_at desc);
create index if not exists idx_news_items_importance_score on public.news_items(importance_score desc);
create index if not exists idx_news_item_categories_news_item_id on public.news_item_categories(news_item_id);
create index if not exists idx_news_item_tags_news_item_id on public.news_item_tags(news_item_id);
create index if not exists idx_company_news_company_id on public.company_news(company_id);
create index if not exists idx_company_news_news_item_id on public.company_news(news_item_id);
create index if not exists idx_events_company_id on public.events(company_id);
create index if not exists idx_events_event_date on public.events(event_date desc);
create index if not exists idx_momentum_scores_company_id on public.momentum_scores(company_id);
create index if not exists idx_momentum_scores_calculated_at on public.momentum_scores(calculated_at desc);

drop trigger if exists companies_set_updated_at on public.companies;

create trigger companies_set_updated_at
before update on public.companies
for each row
execute function public.set_updated_at();
