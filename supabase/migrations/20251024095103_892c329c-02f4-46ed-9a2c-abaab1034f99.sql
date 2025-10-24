-- Drop the problematic function
DROP FUNCTION IF EXISTS public.log_to_discord(text, uuid, text, uuid, text, jsonb, uuid, text);

-- Create logs table
CREATE TABLE IF NOT EXISTS public.discord_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  user_id uuid,
  username text,
  target_user_id uuid,
  target_username text,
  details jsonb,
  admin_id uuid,
  admin_username text,
  sent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discord_logs ENABLE ROW LEVEL SECURITY;

-- Allow system to insert logs
CREATE POLICY "System can insert logs"
ON public.discord_logs
FOR INSERT
WITH CHECK (true);

-- Allow edge function to read and update logs
CREATE POLICY "Service role can manage logs"
ON public.discord_logs
FOR ALL
USING (true);

-- Create simplified log function
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
BEGIN
  INSERT INTO public.discord_logs (
    action, user_id, username, target_user_id, target_username, 
    details, admin_id, admin_username
  ) VALUES (
    p_action, p_user_id, p_username, p_target_user_id, p_target_username,
    p_details, p_admin_id, p_admin_username
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to log to discord_logs: %', SQLERRM;
END;
$$;