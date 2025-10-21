-- Update approve_flame_purchase to create notification
CREATE OR REPLACE FUNCTION public.approve_flame_purchase(purchase_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Create notification for user
  INSERT INTO public.notifications (user_id, type, from_user_id, message)
  VALUES (
    purchase_user_id, 
    'purchase_approved', 
    auth.uid(),
    'Your flame purchase of ' || purchase_flames || ' flames has been approved!'
  );
END;
$function$;

-- Update reject_flame_purchase to create notification
CREATE OR REPLACE FUNCTION public.reject_flame_purchase(purchase_id uuid, reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  purchase_user_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can reject purchases';
  END IF;

  -- Get purchase user
  SELECT user_id INTO purchase_user_id
  FROM public.flame_purchases
  WHERE id = purchase_id AND status = 'pending';

  IF purchase_user_id IS NULL THEN
    RAISE EXCEPTION 'Purchase not found or not pending';
  END IF;

  -- Update purchase status
  UPDATE public.flame_purchases
  SET status = 'rejected',
      processed_at = now(),
      processed_by = auth.uid(),
      rejection_reason = reason
  WHERE id = purchase_id AND status = 'pending';

  -- Create notification for user
  INSERT INTO public.notifications (user_id, type, from_user_id, message)
  VALUES (
    purchase_user_id, 
    'purchase_rejected', 
    auth.uid(),
    'Your flame purchase was rejected. Reason: ' || reason
  );
END;
$function$;