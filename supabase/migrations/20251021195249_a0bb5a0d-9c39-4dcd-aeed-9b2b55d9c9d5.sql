-- Create a function to give fake followers that bypasses RLS
CREATE OR REPLACE FUNCTION public.give_fake_followers(
  target_user_id UUID,
  follower_count INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_count INTEGER := 0;
  fake_user_id UUID;
  fake_username TEXT;
BEGIN
  -- Check if caller is admin/support
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (is_admin = true OR is_support = true)
  ) THEN
    RAISE EXCEPTION 'Only admins can give fake followers';
  END IF;

  -- Create fake followers
  FOR i IN 1..follower_count LOOP
    fake_user_id := gen_random_uuid();
    fake_username := 'user_' || substr(md5(random()::text), 1, 8);
    
    -- Insert fake profile (bypassing RLS with SECURITY DEFINER)
    INSERT INTO profiles (
      id,
      username,
      full_name,
      avatar_url
    ) VALUES (
      fake_user_id,
      fake_username,
      'Fake User ' || i,
      'https://api.dicebear.com/7.x/avataaars/svg?seed=' || fake_username
    );
    
    -- Create follow relationship
    INSERT INTO follows (
      follower_id,
      following_id
    ) VALUES (
      fake_user_id,
      target_user_id
    );
    
    created_count := created_count + 1;
  END LOOP;

  RETURN created_count;
END;
$$;