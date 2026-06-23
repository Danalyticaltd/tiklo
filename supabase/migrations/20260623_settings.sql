-- Platform settings table
create table if not exists public.settings (
  key   text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Seed with current hardcoded rates
insert into public.settings (key, value) values
  ('fee_percent',    '2.5'),   -- percentage of subtotal
  ('fee_flat_cents', '99')     -- flat fee per ticket in cents
on conflict (key) do nothing;

-- Only admins can read or write settings
alter table public.settings enable row level security;

create policy "admin read settings"
  on public.settings for select
  using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

create policy "admin write settings"
  on public.settings for all
  using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );
