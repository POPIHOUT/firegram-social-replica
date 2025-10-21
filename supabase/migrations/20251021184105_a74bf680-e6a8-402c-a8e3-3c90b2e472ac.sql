-- Update approve_flame_purchase to handle creator commission
CREATE OR REPLACE FUNCTION public.approve_flame_purchase(purchase_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  purchase_user_id UUID;
  purchase_flames INTEGER;
  purchase_status TEXT;
  purchase_creator_id UUID;
  purchase_commission INTEGER;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can approve purchases';
  END IF;

  -- Get purchase details
  SELECT user_id, flame_amount, status, creator_id, creator_commission_flames
  INTO purchase_user_id, purchase_flames, purchase_status, purchase_creator_id, purchase_commission
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

  -- Add commission to creator if exists
  IF purchase_creator_id IS NOT NULL AND purchase_commission > 0 THEN
    UPDATE public.profiles
    SET flames = flames + purchase_commission
    WHERE id = purchase_creator_id;
  END IF;

  -- Create notification for user
  INSERT INTO public.notifications (user_id, type, from_user_id, message)
  VALUES (
    purchase_user_id, 
    'purchase_approved', 
    auth.uid(),
    'Your flame purchase of ' || purchase_flames || ' flames has been approved!'
  );
END;
$$;