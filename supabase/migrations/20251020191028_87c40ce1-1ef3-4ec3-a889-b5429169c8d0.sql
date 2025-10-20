-- Add is_premium column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_premium boolean DEFAULT false;

-- Create function to purchase premium
CREATE OR REPLACE FUNCTION public.purchase_premium()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_flames integer;
BEGIN
  -- Get current flames
  SELECT flames INTO user_flames
  FROM public.profiles
  WHERE id = auth.uid();

  -- Check if user has enough flames
  IF user_flames < 1000 THEN
    RAISE EXCEPTION 'Not enough flames. You need 1000 flames to purchase premium.';
  END IF;

  -- Deduct flames and grant premium
  UPDATE public.profiles
  SET flames = flames - 1000,
      is_premium = true
  WHERE id = auth.uid();
END;
$$;