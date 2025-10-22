-- Create function to remove wallet money (admin only)
CREATE OR REPLACE FUNCTION public.admin_remove_wallet_money(
  target_user_id uuid,
  amount_to_remove numeric,
  description_text text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can remove wallet money';
  END IF;

  -- Get current balance
  SELECT wallet_balance INTO current_balance
  FROM public.profiles
  WHERE id = target_user_id;

  -- Check if user has enough money
  IF current_balance < amount_to_remove THEN
    RAISE EXCEPTION 'User does not have enough money. Current balance: $%', current_balance;
  END IF;

  -- Remove money from wallet
  UPDATE public.profiles
  SET wallet_balance = wallet_balance - amount_to_remove
  WHERE id = target_user_id;

  -- Create transaction record
  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, description, created_by)
  VALUES (target_user_id, -amount_to_remove, 'admin_remove', description_text, auth.uid());
END;
$$;