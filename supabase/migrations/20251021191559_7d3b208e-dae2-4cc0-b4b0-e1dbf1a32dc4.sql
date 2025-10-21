-- Allow admins to view all announcements (active and inactive)
DROP POLICY IF EXISTS "Everyone can view active announcements" ON public.update_announcements;

CREATE POLICY "Everyone can view active announcements"
ON public.update_announcements
FOR SELECT
USING (active = true);

CREATE POLICY "Admins can view all announcements"
ON public.update_announcements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.is_admin = true OR profiles.is_support = true)
  )
);

-- Allow admins to delete announcements
CREATE POLICY "Admins can delete announcements"
ON public.update_announcements
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.is_admin = true OR profiles.is_support = true)
  )
);