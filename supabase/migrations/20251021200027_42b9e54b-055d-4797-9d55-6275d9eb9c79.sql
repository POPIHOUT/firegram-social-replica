-- Create function to remove fake followers
CREATE OR REPLACE FUNCTION public.remove_fake_followers(
  target_user_id UUID,
  follower_count INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_fake_count INTEGER;
  new_count INTEGER;
BEGIN
  -- Check if caller is admin/support
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (is_admin = true OR is_support = true)
  ) THEN
    RAISE EXCEPTION 'Only admins can remove fake followers';
  END IF;

  -- Get current fake followers count
  SELECT fake_followers_count INTO current_fake_count
  FROM profiles
  WHERE id = target_user_id;

  -- Calculate new count (don't go below 0)
  new_count := GREATEST(0, current_fake_count - follower_count);

  -- Update fake followers count
  UPDATE profiles
  SET fake_followers_count = new_count
  WHERE id = target_user_id;

  RETURN current_fake_count - new_count;
END;
$$;