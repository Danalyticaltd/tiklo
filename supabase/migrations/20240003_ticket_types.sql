-- Ticket types (General, VIP, Early Bird, etc.) per event
create table public.ticket_types (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  name           text not null,
  price          numeric(10,2) not null check (price >= 0),
  quantity       int not null check (quantity > 0),
  quantity_sold  int not null default 0,
  created_at     timestamptz not null default now()
);

-- RLS
alter table public.ticket_types enable row level security;

create policy "Anyone can read ticket types for published events"
  on public.ticket_types for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.status = 'published'
    )
  );

create policy "Organizers can manage own event ticket types"
  on public.ticket_types for all
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = auth.uid()
    )
  );

create policy "Admins can manage all ticket types"
  on public.ticket_types for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
