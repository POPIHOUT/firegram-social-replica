-- Update approve_flame_purchase function to give 15% wallet commission instead of flames
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
  purchase_creator_id UUID;
  purchase_price NUMERIC;
  purchase_sac_code TEXT;
  creator_commission NUMERIC;
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_support = true))
    OR has_role(auth.uid(), 'system_manager')
  ) THEN
    RAISE EXCEPTION 'Only admins, support and system managers can approve purchases';
  END IF;

  SELECT user_id, flame_amount, status, creator_id, price_usd, sac_code
  INTO purchase_user_id, purchase_flames, purchase_status, purchase_creator_id, purchase_price, purchase_sac_code
  FROM public.flame_purchases WHERE id = purchase_id;

  IF purchase_status != 'pending' THEN
    RAISE EXCEPTION 'Purchase is not pending';
  END IF;

  UPDATE public.flame_purchases
  SET status = 'approved', processed_at = now(), processed_by = auth.uid()
  WHERE id = purchase_id;

  -- Give flames to buyer
  UPDATE public.profiles SET flames = flames + purchase_flames WHERE id = purchase_user_id;

  -- Give 15% wallet commission to creator if SAC code was used
  IF purchase_creator_id IS NOT NULL AND purchase_price > 0 THEN
    creator_commission := purchase_price * 0.15;
    
    UPDATE public.profiles 
    SET wallet_balance = wallet_balance + creator_commission 
    WHERE id = purchase_creator_id;
    
    -- Create transaction record for creator
    INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, description)
    VALUES (
      purchase_creator_id, 
      creator_commission, 
      'sac_commission', 
      'SAC code commission (15%) from flame purchase'
    );
    
    -- Notify creator about commission
    INSERT INTO public.notifications (user_id, type, from_user_id, message)
    VALUES (
      purchase_creator_id, 
      'announcement', 
      auth.uid(), 
      'You received $' || creator_commission || ' commission from your SAC code ' || purchase_sac_code
    );
  END IF;

  -- Notify buyer
  INSERT INTO public.notifications (user_id, type, from_user_id, message)
  VALUES (purchase_user_id, 'purchase_approved', auth.uid(), 'Your flame purchase of ' || purchase_flames || ' flames has been approved!');

  IF purchase_sac_code IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, from_user_id, message)
    VALUES (purchase_user_id, 'announcement', auth.uid(), 'Thank you for supporting a creator with SAC code ' || purchase_sac_code || '! You received a 5% discount on your purchase.');
  END IF;
END;
$function$;