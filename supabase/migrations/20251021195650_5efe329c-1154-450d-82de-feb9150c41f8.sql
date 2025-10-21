-- Add fake followers count column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS fake_followers_count INTEGER DEFAULT 0;

-- Update the give_fake_followers function to just increment counter
CREATE OR REPLACE FUNCTION public.give_fake_followers(
  target_user_id UUID,
  follower_count INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin/support
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (is_admin = true OR is_support = true)
  ) THEN
    RAISE EXCEPTION 'Only admins can give fake followers';
  END IF;

  -- Increment fake followers count
  UPDATE profiles
  SET fake_followers_count = fake_followers_count + follower_count
  WHERE id = target_user_id;

  RETURN follower_count;
END;
$$;