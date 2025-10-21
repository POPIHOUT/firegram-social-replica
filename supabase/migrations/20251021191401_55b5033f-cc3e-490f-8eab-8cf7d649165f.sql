-- Allow admins and support to view all locks (active and inactive)
CREATE POLICY "Admins and support can view all locks"
ON public.update_locks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.is_admin = true OR profiles.is_support = true)
  )
);