-- Create flame purchases table
CREATE TABLE public.flame_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flame_amount INTEGER NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  card_type TEXT NOT NULL CHECK (card_type IN ('visa', 'mastercard')),
  card_last4 TEXT NOT NULL,
  card_holder_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES public.profiles(id),
  rejection_reason TEXT
);

-- Enable RLS
ALTER TABLE public.flame_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases"
ON public.flame_purchases
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create purchases
CREATE POLICY "Users can create purchases"
ON public.flame_purchases
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all purchases
CREATE POLICY "Admins can view all purchases"
ON public.flame_purchases
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Admins can update purchases (approve/reject)
CREATE POLICY "Admins can update purchases"
ON public.flame_purchases
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Function to approve flame purchase
CREATE OR REPLACE FUNCTION public.approve_flame_purchase(purchase_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  purchase_user_id UUID;
  purchase_flames INTEGER;
  purchase_status TEXT;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can approve purchases';
  END IF;

  -- Get purchase details
  SELECT user_id, flame_amount, status
  INTO purchase_user_id, purchase_flames, purchase_status
  FROM public.flame_purchases
  WHERE id = purchase_id;

  IF purchase_status != 'pending' THEN
    RAISE EXCEPTION 'Purchase is not pending';
  END IF;

  -- Update purchase status
  UPDATE public.flame_purchases
  SET status = 'approved',
      processed_at = now(),
      processed_by = auth.uid()
  WHERE id = purchase_id;

  -- Add flames to user
  UPDATE public.profiles
  SET flames = flames + purchase_flames
  WHERE id = purchase_user_id;
END;
$$;

-- Function to reject flame purchase
CREATE OR REPLACE FUNCTION public.reject_flame_purchase(purchase_id UUID, reason TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can reject purchases';
  END IF;

  -- Update purchase status
  UPDATE public.flame_purchases
  SET status = 'rejected',
      processed_at = now(),
      processed_by = auth.uid(),
      rejection_reason = reason
  WHERE id = purchase_id AND status = 'pending';
END;
$$;