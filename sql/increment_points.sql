-- Run this in Supabase SQL editor to enable points RPC
CREATE OR REPLACE FUNCTION increment_points(uid uuid, amount integer)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.profiles
  SET points_total = points_total + amount,
      updated_at = now()
  WHERE id = uid;
$$;
