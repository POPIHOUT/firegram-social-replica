-- Allow support to view/update wallet deposits and flame purchases
DROP POLICY IF EXISTS "Admins and system managers can view all deposits" ON public.wallet_deposits;
DROP POLICY IF EXISTS "Admins and system managers can update deposits" ON public.wallet_deposits;

CREATE POLICY "Admins, support and system managers can view all deposits"
ON public.wallet_deposits
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_support = true))
  OR has_role(auth.uid(), 'system_manager')
);

CREATE POLICY "Admins, support and system managers can update deposits"
ON public.wallet_deposits
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_support = true))
  OR has_role(auth.uid(), 'system_manager')
);

-- Flame purchases policies
DROP POLICY IF EXISTS "Admins and system managers can view all purchases" ON public.flame_purchases;
DROP POLICY IF EXISTS "Admins and system managers can update purchases" ON public.flame_purchases;

CREATE POLICY "Admins, support and system managers can view all purchases"
ON public.flame_purchases
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_support = true))
  OR has_role(auth.uid(), 'system_manager')
);

CREATE POLICY "Admins, support and system managers can update purchases"
ON public.flame_purchases
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_support = true))
  OR has_role(auth.uid(), 'system_manager')
);

-- Update RPC functions to allow support as well
CREATE OR REPLACE FUNCTION public.approve_wallet_deposit(deposit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deposit_user_id UUID;
  deposit_amount NUMERIC;
  deposit_status TEXT;
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_support = true))
    OR has_role(auth.uid(), 'system_manager')
  ) THEN
    RAISE EXCEPTION 'Only admins, support and system managers can approve deposits';
  END IF;

  SELECT user_id, amount, status INTO deposit_user_id, deposit_amount, deposit_status
  FROM public.wallet_deposits WHERE id = deposit_id;

  IF deposit_status != 'pending' THEN
    RAISE EXCEPTION 'Deposit is not pending';
  END IF;

  UPDATE public.wallet_deposits
  SET status = 'approved', processed_at = now(), processed_by = auth.uid()
  WHERE id = deposit_id;

  UPDATE public.profiles SET wallet_balance = wallet_balance + deposit_amount
  WHERE id = deposit_user_id;

  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, description, created_by)
  VALUES (deposit_user_id, deposit_amount, 'deposit', 'Wallet deposit approved', auth.uid());

  INSERT INTO public.notifications (user_id, type, from_user_id, message)
  VALUES (deposit_user_id, 'wallet_approved', auth.uid(), 'Your wallet deposit of $' || deposit_amount || ' has been approved!');
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_wallet_deposit(deposit_id uuid, reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deposit_user_id UUID;
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_support = true))
    OR has_role(auth.uid(), 'system_manager')
  ) THEN
    RAISE EXCEPTION 'Only admins, support and system managers can reject deposits';
  END IF;

  SELECT user_id INTO deposit_user_id
  FROM public.wallet_deposits
  WHERE id = deposit_id AND status = 'pending';

  IF deposit_user_id IS NULL THEN
    RAISE EXCEPTION 'Deposit not found or not pending';
  END IF;

  UPDATE public.wallet_deposits
  SET status = 'rejected', processed_at = now(), processed_by = auth.uid(), rejection_reason = reason
  WHERE id = deposit_id AND status = 'pending';

  INSERT INTO public.notifications (user_id, type, from_user_id, message)
  VALUES (deposit_user_id, 'wallet_rejected', auth.uid(), 'Your wallet deposit was rejected. Reason: ' || reason);
END;
$function$;

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
  purchase_commission INTEGER;
  purchase_sac_code TEXT;
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_support = true))
    OR has_role(auth.uid(), 'system_manager')
  ) THEN
    RAISE EXCEPTION 'Only admins, support and system managers can approve purchases';
  END IF;

  SELECT user_id, flame_amount, status, creator_id, creator_commission_flames, sac_code
  INTO purchase_user_id, purchase_flames, purchase_status, purchase_creator_id, purchase_commission, purchase_sac_code
  FROM public.flame_purchases WHERE id = purchase_id;

  IF purchase_status != 'pending' THEN
    RAISE EXCEPTION 'Purchase is not pending';
  END IF;

  UPDATE public.flame_purchases
  SET status = 'approved', processed_at = now(), processed_by = auth.uid()
  WHERE id = purchase_id;

  UPDATE public.profiles SET flames = flames + purchase_flames WHERE id = purchase_user_id;

  IF purchase_creator_id IS NOT NULL AND purchase_commission > 0 THEN
    UPDATE public.profiles SET flames = flames + purchase_commission WHERE id = purchase_creator_id;
  END IF;

  INSERT INTO public.notifications (user_id, type, from_user_id, message)
  VALUES (purchase_user_id, 'purchase_approved', auth.uid(), 'Your flame purchase of ' || purchase_flames || ' flames has been approved!');

  IF purchase_sac_code IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, from_user_id, message)
    VALUES (purchase_user_id, 'announcement', auth.uid(), 'Thank you for supporting a creator with SAC code ' || purchase_sac_code || '! You received a 5% discount on your purchase.');
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_flame_purchase(purchase_id uuid, reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  purchase_user_id UUID;
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_support = true))
    OR has_role(auth.uid(), 'system_manager')
  ) THEN
    RAISE EXCEPTION 'Only admins, support and system managers can reject purchases';
  END IF;

  SELECT user_id INTO purchase_user_id
  FROM public.flame_purchases
  WHERE id = purchase_id AND status = 'pending';

  IF purchase_user_id IS NULL THEN
    RAISE EXCEPTION 'Purchase not found or not pending';
  END IF;

  UPDATE public.flame_purchases
  SET status = 'rejected', processed_at = now(), processed_by = auth.uid(), rejection_reason = reason
  WHERE id = purchase_id AND status = 'pending';

  INSERT INTO public.notifications (user_id, type, from_user_id, message)
  VALUES (purchase_user_id, 'purchase_rejected', auth.uid(), 'Your flame purchase was rejected. Reason: ' || reason);
END;
$function$;

-- Admin wallet management functions
CREATE OR REPLACE FUNCTION public.admin_add_wallet_money(target_user_id uuid, amount_to_add numeric, description_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_support = true))
    OR has_role(auth.uid(), 'system_manager')
  ) THEN
    RAISE EXCEPTION 'Only admins, support and system managers can add wallet money';
  END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance + amount_to_add WHERE id = target_user_id;

  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, description, created_by)
  VALUES (target_user_id, amount_to_add, 'admin_add', description_text, auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_remove_wallet_money(target_user_id uuid, amount_to_remove numeric, description_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_balance NUMERIC;
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_support = true))
    OR has_role(auth.uid(), 'system_manager')
  ) THEN
    RAISE EXCEPTION 'Only admins, support and system managers can remove wallet money';
  END IF;

  SELECT wallet_balance INTO current_balance FROM public.profiles WHERE id = target_user_id;

  IF current_balance < amount_to_remove THEN
    RAISE EXCEPTION 'User does not have enough money. Current balance: $%', current_balance;
  END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance - amount_to_remove WHERE id = target_user_id;

  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, description, created_by)
  VALUES (target_user_id, -amount_to_remove, 'admin_remove', description_text, auth.uid());
END;
$function$;