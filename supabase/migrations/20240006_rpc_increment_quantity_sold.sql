-- Called by the webhook after successful payment to atomically increment quantity_sold
create or replace function public.increment_quantity_sold(p_ticket_type_id uuid, p_quantity int)
returns void language plpgsql security definer as $$
begin
  update public.ticket_types
  set quantity_sold = quantity_sold + p_quantity
  where id = p_ticket_type_id;
end;
$$;
