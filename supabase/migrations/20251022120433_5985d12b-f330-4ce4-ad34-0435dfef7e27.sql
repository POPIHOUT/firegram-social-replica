-- Add wallet and personal info columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Create wallet transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL, -- 'deposit', 'purchase', 'admin_add'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallet_transactions
CREATE POLICY "Users can view own transactions"
ON public.wallet_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
ON public.wallet_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "System can create transactions"
ON public.wallet_transactions
FOR INSERT
WITH CHECK (true);

-- Function to add money to wallet (admin only)
CREATE OR REPLACE FUNCTION public.admin_add_wallet_money(
  target_user_id UUID,
  amount_to_add NUMERIC,
  description_text TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can add wallet money';
  END IF;

  -- Add money to wallet
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + amount_to_add
  WHERE id = target_user_id;

  -- Create transaction record
  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, description, created_by)
  VALUES (target_user_id, amount_to_add, 'admin_add', description_text, auth.uid());
END;
$$;

-- Function to purchase flames with wallet
CREATE OR REPLACE FUNCTION public.purchase_flames_with_wallet(
  flame_amount INTEGER,
  price_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_wallet NUMERIC;
BEGIN
  -- Get current wallet balance
  SELECT wallet_balance INTO user_wallet
  FROM public.profiles
  WHERE id = auth.uid();

  -- Check if user has enough money
  IF user_wallet < price_amount THEN
    RAISE EXCEPTION 'Not enough money in wallet. You need $ % but have $ %', price_amount, user_wallet;
  END IF;

  -- Deduct from wallet
  UPDATE public.profiles
  SET wallet_balance = wallet_balance - price_amount,
      flames = flames + flame_amount
  WHERE id = auth.uid();

  -- Create transaction record
  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, description)
  VALUES (auth.uid(), -price_amount, 'purchase', flame_amount || ' flames purchased');
END;
$$;