-- Individual tickets generated after a paid order
create table public.tickets (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  event_id        uuid not null references public.events(id),
  ticket_type_id  uuid not null references public.ticket_types(id),
  buyer_name      text,
  buyer_email     text,
  -- QR payload is a plain UUID; never expose order ID or PII in the QR string
  qr_code         text unique not null default gen_random_uuid()::text,
  checked_in      boolean not null default false,
  checked_in_at   timestamptz,
  created_at      timestamptz not null default now()
);

-- RLS
alter table public.tickets enable row level security;

-- Buyers can look up their own ticket by ID (public ticket confirmation page)
create policy "Anyone can read a ticket by id"
  on public.tickets for select
  using (true);

-- Organizers can manage tickets for their events (needed for check-in)
create policy "Organizers can update tickets for own events"
  on public.tickets for update
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = auth.uid()
    )
  );

create policy "Organizers can read tickets for own events"
  on public.tickets for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = auth.uid()
    )
  );

create policy "Admins can manage all tickets"
  on public.tickets for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
