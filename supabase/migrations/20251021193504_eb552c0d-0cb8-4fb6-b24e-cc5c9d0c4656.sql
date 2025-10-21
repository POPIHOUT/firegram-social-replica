-- Add column to store user IDs who can bypass the lock
ALTER TABLE public.update_locks
ADD COLUMN bypass_user_ids UUID[] DEFAULT '{}';

-- Update the RLS policy to allow viewing locks for bypassed users
CREATE POLICY "Bypassed users can view locks"
ON public.update_locks
FOR SELECT
USING (
  auth.uid() = ANY(bypass_user_ids)
);