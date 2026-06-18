-- Fix infinite recursion in RLS policies caused by admin policies
-- querying the profiles table from within a profiles policy.
-- Solution: security definer function bypasses RLS when reading role.

create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- profiles
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.get_my_role() = 'admin');
create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.get_my_role() = 'admin');

-- events
drop policy if exists "Admins can manage all events" on public.events;
create policy "Admins can manage all events"
  on public.events for all
  using (public.get_my_role() = 'admin');

-- ticket_types
drop policy if exists "Admins can manage all ticket types" on public.ticket_types;
create policy "Admins can manage all ticket types"
  on public.ticket_types for all
  using (public.get_my_role() = 'admin');

-- orders
drop policy if exists "Admins can manage all orders" on public.orders;
create policy "Admins can manage all orders"
  on public.orders for all
  using (public.get_my_role() = 'admin');

-- tickets
drop policy if exists "Admins can manage all tickets" on public.tickets;
create policy "Admins can manage all tickets"
  on public.tickets for all
  using (public.get_my_role() = 'admin');
