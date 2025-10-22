-- Create wallet codes table
CREATE TABLE public.wallet_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  value NUMERIC NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT positive_value CHECK (value > 0),
  CONSTRAINT positive_max_uses CHECK (max_uses > 0),
  CONSTRAINT valid_uses CHECK (current_uses >= 0 AND current_uses <= max_uses)
);

-- Create wallet code redemptions tracking table
CREATE TABLE public.wallet_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES public.wallet_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  amount NUMERIC NOT NULL
);

-- Enable RLS
ALTER TABLE public.wallet_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_code_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallet_codes
CREATE POLICY "Admins, support and system managers can view all codes"
  ON public.wallet_codes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_support = true))
    OR has_role(auth.uid(), 'system_manager')
  );

CREATE POLICY "Admins, support and system managers can create codes"
  ON public.wallet_codes FOR INSERT
  WITH CHECK (
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_support = true))
    OR has_role(auth.uid(), 'system_manager'))
    AND auth.uid() = created_by
  );

CREATE POLICY "Admins, support and system managers can update codes"
  ON public.wallet_codes FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_support = true))
    OR has_role(auth.uid(), 'system_manager')
  );

CREATE POLICY "Admins, support and system managers can delete codes"
  ON public.wallet_codes FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_support = true))
    OR has_role(auth.uid(), 'system_manager')
  );

-- RLS Policies for wallet_code_redemptions
CREATE POLICY "Users can view own redemptions"
  ON public.wallet_code_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all redemptions"
  ON public.wallet_code_redemptions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_support = true))
    OR has_role(auth.uid(), 'system_manager')
  );

CREATE POLICY "System can create redemptions"
  ON public.wallet_code_redemptions FOR INSERT
  WITH CHECK (true);

-- Function to redeem wallet code
CREATE OR REPLACE FUNCTION public.redeem_wallet_code(code_text TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_record RECORD;
  code_value NUMERIC;
BEGIN
  -- Get code details with row lock
  SELECT id, value, max_uses, current_uses, active, expires_at
  INTO code_record
  FROM public.wallet_codes
  WHERE code = code_text
  FOR UPDATE;

  -- Validate code exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid code';
  END IF;

  -- Validate code is active
  IF NOT code_record.active THEN
    RAISE EXCEPTION 'This code is no longer active';
  END IF;

  -- Validate code hasn't expired
  IF code_record.expires_at IS NOT NULL AND code_record.expires_at < now() THEN
    RAISE EXCEPTION 'This code has expired';
  END IF;

  -- Validate code hasn't reached max uses
  IF code_record.current_uses >= code_record.max_uses THEN
    RAISE EXCEPTION 'This code has been fully redeemed';
  END IF;

  -- Check if user already redeemed this code
  IF EXISTS (
    SELECT 1 FROM public.wallet_code_redemptions
    WHERE code_id = code_record.id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You have already redeemed this code';
  END IF;

  -- Update wallet balance
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + code_record.value
  WHERE id = auth.uid();

  -- Increment code usage
  UPDATE public.wallet_codes
  SET current_uses = current_uses + 1
  WHERE id = code_record.id;

  -- Record redemption
  INSERT INTO public.wallet_code_redemptions (code_id, user_id, amount)
  VALUES (code_record.id, auth.uid(), code_record.value);

  -- Create transaction record
  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, description)
  VALUES (auth.uid(), code_record.value, 'code_redemption', 'Redeemed wallet code: ' || code_text);

  RETURN code_record.value;
END;
$$;