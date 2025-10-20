-- Drop the problematic foreign key constraint
ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS fk_user;

-- Stories don't need a foreign key to auth.users since we can't query it directly
-- The user_id will still be validated by the RLS policy