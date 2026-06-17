-- Orders created when a buyer initiates checkout
create table public.orders (
  id                     uuid primary key default gen_random_uuid(),
  event_id               uuid not null references public.events(id),
  ticket_type_id         uuid not null references public.ticket_types(id),
  buyer_email            text not null,
  buyer_name             text not null,
  quantity               int not null check (quantity > 0),
  subtotal               numeric(10,2),
  platform_fee           numeric(10,2),
  stripe_payment_intent  text,
  status                 text not null default 'pending' check (status in ('pending', 'paid', 'refunded')),
  created_at             timestamptz not null default now()
);

-- RLS
alter table public.orders enable row level security;

-- Orders are created/updated by serverless functions using the service role key,
-- so client-side policies are read-only for organizers and buyers.

create policy "Organizers can read orders for own events"
  on public.orders for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = auth.uid()
    )
  );

create policy "Admins can manage all orders"
  on public.orders for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
