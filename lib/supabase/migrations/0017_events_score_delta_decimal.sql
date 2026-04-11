alter table public.events
  alter column score_delta type decimal
  using score_delta::decimal;
