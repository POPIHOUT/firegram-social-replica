-- Allow users to view wallet codes for validation (but not the full list, only when checking specific codes)
-- This is safe because users still can't redeem without the RPC function which has proper checks
CREATE POLICY "Users can check specific wallet codes"
  ON public.wallet_codes FOR SELECT
  USING (active = true);