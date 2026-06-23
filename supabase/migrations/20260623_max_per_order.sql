alter table public.ticket_types
  add column if not exists max_per_order int not null default 10;
