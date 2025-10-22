-- Create wallet deposits table for admin approval
CREATE TABLE IF NOT EXISTS public.wallet_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  card_type TEXT NOT NULL,
  card_last4 TEXT NOT NULL,
  card_holder_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT
);

-- Enable RLS
ALTER TABLE public.wallet_deposits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own deposits"
ON public.wallet_deposits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all deposits"
ON public.wallet_deposits
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Users can create deposits"
ON public.wallet_deposits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update deposits"
ON public.wallet_deposits
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Function to approve wallet deposit
CREATE OR REPLACE FUNCTION public.approve_wallet_deposit(deposit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deposit_user_id UUID;
  deposit_amount NUMERIC;
  deposit_status TEXT;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can approve deposits';
  END IF;

  -- Get deposit details
  SELECT user_id, amount, status
  INTO deposit_user_id, deposit_amount, deposit_status
  FROM public.wallet_deposits
  WHERE id = deposit_id;

  IF deposit_status != 'pending' THEN
    RAISE EXCEPTION 'Deposit is not pending';
  END IF;

  -- Update deposit status
  UPDATE public.wallet_deposits
  SET status = 'approved',
      processed_at = now(),
      processed_by = auth.uid()
  WHERE id = deposit_id;

  -- Add money to wallet
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + deposit_amount
  WHERE id = deposit_user_id;

  -- Create transaction record
  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, description, created_by)
  VALUES (deposit_user_id, deposit_amount, 'deposit', 'Wallet deposit approved', auth.uid());

  -- Create notification for user
  INSERT INTO public.notifications (user_id, type, from_user_id, message)
  VALUES (
    deposit_user_id, 
    'wallet_approved', 
    auth.uid(),
    'Your wallet deposit of $' || deposit_amount || ' has been approved!'
  );
END;
$$;

-- Function to reject wallet deposit
CREATE OR REPLACE FUNCTION public.reject_wallet_deposit(deposit_id uuid, reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deposit_user_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can reject deposits';
  END IF;

  -- Get deposit user
  SELECT user_id INTO deposit_user_id
  FROM public.wallet_deposits
  WHERE id = deposit_id AND status = 'pending';

  IF deposit_user_id IS NULL THEN
    RAISE EXCEPTION 'Deposit not found or not pending';
  END IF;

  -- Update deposit status
  UPDATE public.wallet_deposits
  SET status = 'rejected',
      processed_at = now(),
      processed_by = auth.uid(),
      rejection_reason = reason
  WHERE id = deposit_id AND status = 'pending';

  -- Create notification for user
  INSERT INTO public.notifications (user_id, type, from_user_id, message)
  VALUES (
    deposit_user_id, 
    'wallet_rejected', 
    auth.uid(),
    'Your wallet deposit was rejected. Reason: ' || reason
  );
END;
$$;