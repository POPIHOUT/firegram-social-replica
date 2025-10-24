-- Create function to call discord logger
CREATE OR REPLACE FUNCTION public.log_to_discord(
  p_action text,
  p_user_id uuid DEFAULT NULL,
  p_username text DEFAULT NULL,
  p_target_user_id uuid DEFAULT NULL,
  p_target_username text DEFAULT NULL,
  p_details jsonb DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL,
  p_admin_username text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
BEGIN
  payload := jsonb_build_object(
    'action', p_action,
    'user_id', p_user_id,
    'username', p_username,
    'target_user_id', p_target_user_id,
    'target_username', p_target_username,
    'details', p_details,
    'admin_id', p_admin_id,
    'admin_username', p_admin_username
  );

  -- Call edge function asynchronously (fire and forget)
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/discord-logger',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := payload
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send Discord notification: %', SQLERRM;
END;
$$;

-- Update approve_flame_purchase to log
CREATE OR REPLACE FUNCTION public.approve_flame_purchase(purchase_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  purchase_user_id UUID;
  purchase_flames INTEGER;
  purchase_status TEXT;
  purchase_creator_id UUID;
  purchase_price NUMERIC;
  purchase_sac_code TEXT;
  purchase_payment_method TEXT;
  creator_commission NUMERIC;
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_support = true))
    OR has_role(auth.uid(), 'system_manager')
  ) THEN
    RAISE EXCEPTION 'Only admins, support and system managers can approve purchases';
  END IF;

  SELECT user_id, flame_amount, status, creator_id, price_usd, sac_code, card_type
  INTO purchase_user_id, purchase_flames, purchase_status, purchase_creator_id, purchase_price, purchase_sac_code, purchase_payment_method
  FROM public.flame_purchases WHERE id = purchase_id;

  IF purchase_status != 'pending' THEN
    RAISE EXCEPTION 'Purchase is not pending';
  END IF;

  UPDATE public.flame_purchases
  SET status = 'approved', processed_at = now(), processed_by = auth.uid()
  WHERE id = purchase_id;

  UPDATE public.profiles SET flames = flames + purchase_flames WHERE id = purchase_user_id;

  IF purchase_creator_id IS NOT NULL AND purchase_price > 0 THEN
    creator_commission := purchase_price * 0.15;
    
    UPDATE public.profiles 
    SET wallet_balance = wallet_balance + creator_commission 
    WHERE id = purchase_creator_id;
    
    INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, description)
    VALUES (
      purchase_creator_id, 
      creator_commission, 
      'sac_commission', 
      'SAC code commission (15%) from flame purchase'
    );
    
    INSERT INTO public.notifications (user_id, type, from_user_id, message)
    VALUES (
      purchase_creator_id, 
      'announcement', 
      auth.uid(), 
      'You received $' || creator_commission || ' commission from your SAC code ' || purchase_sac_code
    );
  END IF;

  INSERT INTO public.notifications (user_id, type, from_user_id, message)
  VALUES (purchase_user_id, 'purchase_approved', auth.uid(), 'Your flame purchase of ' || purchase_flames || ' flames has been approved!');

  IF purchase_sac_code IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, from_user_id, message)
    VALUES (purchase_user_id, 'announcement', auth.uid(), 'Thank you for supporting a creator with SAC code ' || purchase_sac_code || '! You received a 5% discount on your purchase.');
  END IF;

  -- Log to Discord
  PERFORM log_to_discord(
    'flame_purchase_approved',
    purchase_user_id,
    NULL,
    NULL,
    NULL,
    jsonb_build_object(
      'flame_amount', purchase_flames,
      'price_usd', purchase_price,
      'payment_method', purchase_payment_method,
      'sac_code', purchase_sac_code
    ),
    auth.uid(),
    NULL
  );
END;
$function$;

-- Update approve_wallet_deposit to log
CREATE OR REPLACE FUNCTION public.approve_wallet_deposit(deposit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

  -- Log to Discord
  PERFORM log_to_discord(
    'wallet_deposit_approved',
    deposit_user_id,
    NULL,
    NULL,
    NULL,
    jsonb_build_object('amount', deposit_amount),
    auth.uid(),
    NULL
  );
END;
$function$;

-- Update admin_add_wallet_money to log
CREATE OR REPLACE FUNCTION public.admin_add_wallet_money(target_user_id uuid, amount_to_add numeric, description_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

  -- Log to Discord
  PERFORM log_to_discord(
    'wallet_money_added',
    NULL,
    NULL,
    target_user_id,
    NULL,
    jsonb_build_object('amount', amount_to_add, 'description', description_text),
    auth.uid(),
    NULL
  );
END;
$function$;

-- Update admin_remove_wallet_money to log
CREATE OR REPLACE FUNCTION public.admin_remove_wallet_money(target_user_id uuid, amount_to_remove numeric, description_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

  -- Log to Discord
  PERFORM log_to_discord(
    'wallet_money_removed',
    NULL,
    NULL,
    target_user_id,
    NULL,
    jsonb_build_object('amount', amount_to_remove, 'description', description_text),
    auth.uid(),
    NULL
  );
END;
$function$;

-- Create trigger for premium purchases
CREATE OR REPLACE FUNCTION public.log_premium_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.is_premium = true AND (OLD.is_premium = false OR OLD.is_premium IS NULL) THEN
    PERFORM log_to_discord(
      'premium_purchased',
      NEW.id,
      NEW.username,
      NULL,
      NULL,
      jsonb_build_object(
        'duration', '1 month',
        'cost_flames', 1000
      ),
      NULL,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER premium_purchase_log
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (NEW.is_premium = true AND (OLD.is_premium = false OR OLD.is_premium IS NULL))
EXECUTE FUNCTION log_premium_purchase();

-- Create trigger for effect purchases
CREATE OR REPLACE FUNCTION public.log_effect_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  effect_name TEXT;
  effect_price INTEGER;
BEGIN
  SELECT name, price INTO effect_name, effect_price
  FROM public.effects
  WHERE id = NEW.effect_id;

  PERFORM log_to_discord(
    'effect_purchased',
    NEW.user_id,
    NULL,
    NULL,
    NULL,
    jsonb_build_object(
      'effect_name', effect_name,
      'price', effect_price
    ),
    NULL,
    NULL
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER effect_purchase_log
AFTER INSERT ON public.user_effects
FOR EACH ROW
EXECUTE FUNCTION log_effect_purchase();

-- Create trigger for frame purchases
CREATE OR REPLACE FUNCTION public.log_frame_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  frame_name TEXT;
  frame_price INTEGER;
BEGIN
  SELECT name, price INTO frame_name, frame_price
  FROM public.frames
  WHERE id = NEW.frame_id;

  PERFORM log_to_discord(
    'frame_purchased',
    NEW.user_id,
    NULL,
    NULL,
    NULL,
    jsonb_build_object(
      'frame_name', frame_name,
      'price', frame_price
    ),
    NULL,
    NULL
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER frame_purchase_log
AFTER INSERT ON public.user_frames
FOR EACH ROW
EXECUTE FUNCTION log_frame_purchase();

-- Create trigger for bans
CREATE OR REPLACE FUNCTION public.log_user_ban()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.banned = true AND (OLD.banned = false OR OLD.banned IS NULL) THEN
    PERFORM log_to_discord(
      'user_banned',
      NULL,
      NULL,
      NEW.id,
      NEW.username,
      jsonb_build_object('reason', NEW.ban_reason),
      auth.uid(),
      NULL
    );
  ELSIF NEW.banned = false AND OLD.banned = true THEN
    PERFORM log_to_discord(
      'user_unbanned',
      NULL,
      NULL,
      NEW.id,
      NEW.username,
      NULL,
      auth.uid(),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_ban_log
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (NEW.banned IS DISTINCT FROM OLD.banned)
EXECUTE FUNCTION log_user_ban();

-- Create trigger for suspensions
CREATE OR REPLACE FUNCTION public.log_user_suspension()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.suspended = true AND (OLD.suspended = false OR OLD.suspended IS NULL) THEN
    PERFORM log_to_discord(
      'user_suspended',
      NULL,
      NULL,
      NEW.id,
      NEW.username,
      jsonb_build_object(
        'reason', NEW.suspended_reason,
        'until', NEW.suspended_until
      ),
      auth.uid(),
      NULL
    );
  ELSIF NEW.suspended = false AND OLD.suspended = true THEN
    PERFORM log_to_discord(
      'user_unsuspended',
      NULL,
      NULL,
      NEW.id,
      NEW.username,
      NULL,
      auth.uid(),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_suspension_log
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (NEW.suspended IS DISTINCT FROM OLD.suspended)
EXECUTE FUNCTION log_user_suspension();

-- Create trigger for role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_to_discord(
      'role_added',
      NULL,
      NULL,
      NEW.user_id,
      NULL,
      jsonb_build_object('role', NEW.role::text),
      auth.uid(),
      NULL
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_to_discord(
      'role_removed',
      NULL,
      NULL,
      OLD.user_id,
      NULL,
      jsonb_build_object('role', OLD.role::text),
      auth.uid(),
      NULL
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER role_change_log
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION log_role_change();