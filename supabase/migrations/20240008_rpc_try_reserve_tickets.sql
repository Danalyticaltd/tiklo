-- Atomic ticket reservation using PL/pgSQL.
-- Returns TRUE if reservation succeeded, FALSE if sold out.
CREATE OR REPLACE FUNCTION try_reserve_tickets(
  p_ticket_type_id uuid,
  p_quantity        int
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE ticket_types
  SET    quantity_sold = quantity_sold + p_quantity
  WHERE  id            = p_ticket_type_id
    AND  quantity_sold + p_quantity <= quantity;

  RETURN FOUND;
END;
$$;

-- Hard DB-level guard: quantity_sold can never exceed quantity.
ALTER TABLE ticket_types
  DROP CONSTRAINT IF EXISTS no_oversell,
  ADD  CONSTRAINT no_oversell CHECK (quantity_sold <= quantity);
