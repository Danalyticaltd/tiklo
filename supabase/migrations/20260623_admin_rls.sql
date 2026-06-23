-- Admin superior permissions: full read/write/delete on all core tables

-- ── events ──────────────────────────────────────────────────────────────────
create policy "admin full access events"
  on public.events for all
  using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

-- ── ticket_types ─────────────────────────────────────────────────────────────
create policy "admin full access ticket_types"
  on public.ticket_types for all
  using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

-- ── orders ───────────────────────────────────────────────────────────────────
create policy "admin full access orders"
  on public.orders for all
  using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

-- ── tickets ──────────────────────────────────────────────────────────────────
create policy "admin full access tickets"
  on public.tickets for all
  using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );
