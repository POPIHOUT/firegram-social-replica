-- Add premium expiration date
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS premium_until timestamp with time zone;

-- Update purchase_premium function to set expiration
CREATE OR REPLACE FUNCTION public.purchase_premium()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Deduct flames and grant premium for 1 month
  UPDATE public.profiles
  SET flames = flames - 1000,
      is_premium = true,
      premium_until = now() + interval '1 month'
  WHERE id = auth.uid();
END;
$$;

-- Function to expire premium subscriptions
CREATE OR REPLACE FUNCTION public.expire_premium_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET is_premium = false
  WHERE is_premium = true
    AND premium_until IS NOT NULL
    AND premium_until <= now();
END;
$$;