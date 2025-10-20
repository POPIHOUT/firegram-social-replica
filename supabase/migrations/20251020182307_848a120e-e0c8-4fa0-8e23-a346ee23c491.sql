-- Create a function to get user emails for admin panel
CREATE OR REPLACE FUNCTION public.get_user_emails()
RETURNS TABLE (
  user_id uuid,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id as user_id,
    email
  FROM auth.users;
$$;