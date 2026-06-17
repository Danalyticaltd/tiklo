-- Events created by approved organizers
create table public.events (
  id            uuid primary key default gen_random_uuid(),
  organizer_id  uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text,
  location      text,
  event_date    timestamptz not null,
  banner_url    text,
  community_tag text check (community_tag in ('African', 'Caribbean', 'South Asian', 'Latin', 'Other')),
  city          text,
  status        text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),
  created_at    timestamptz not null default now()
);

-- RLS
alter table public.events enable row level security;

create policy "Anyone can read published events"
  on public.events for select
  using (status = 'published');

create policy "Organizers can read own events"
  on public.events for select
  using (auth.uid() = organizer_id);

create policy "Organizers can insert own events"
  on public.events for insert
  with check (auth.uid() = organizer_id);

create policy "Organizers can update own events"
  on public.events for update
  using (auth.uid() = organizer_id);

create policy "Organizers can delete own draft events"
  on public.events for delete
  using (auth.uid() = organizer_id and status = 'draft');

create policy "Admins can manage all events"
  on public.events for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
