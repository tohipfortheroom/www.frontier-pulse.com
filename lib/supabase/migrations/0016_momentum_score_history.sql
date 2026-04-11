create table if not exists public.momentum_score_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  date_key date not null,
  score decimal not null,
  calculated_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (company_id, date_key)
);

create index if not exists idx_momentum_score_history_company_id on public.momentum_score_history(company_id);
create index if not exists idx_momentum_score_history_date_key on public.momentum_score_history(date_key desc);

insert into public.momentum_score_history (company_id, date_key, score, calculated_at)
select distinct on (company_id, ((calculated_at at time zone 'utc')::date))
  company_id,
  (calculated_at at time zone 'utc')::date as date_key,
  score,
  calculated_at
from public.momentum_scores
order by company_id, ((calculated_at at time zone 'utc')::date), calculated_at desc
on conflict (company_id, date_key) do update
set
  score = excluded.score,
  calculated_at = excluded.calculated_at;
