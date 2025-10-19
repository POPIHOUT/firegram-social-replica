-- Allow support users to update any profile
CREATE POLICY "Support can update any profile"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_support = true
  )
);