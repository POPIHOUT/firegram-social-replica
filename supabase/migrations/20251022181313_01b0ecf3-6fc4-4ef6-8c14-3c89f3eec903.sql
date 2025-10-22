-- Add status, website_url and rejection_reason to advertisements
ALTER TABLE public.advertisements 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS processed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS processed_at timestamp with time zone;

-- Add check constraint for status
ALTER TABLE public.advertisements 
ADD CONSTRAINT advertisements_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update RLS policy to show only approved ads to regular users
DROP POLICY IF EXISTS "Advertisements are viewable by everyone" ON public.advertisements;

CREATE POLICY "Approved advertisements are viewable by everyone"
ON public.advertisements
FOR SELECT
USING (status = 'approved' AND active = true AND expires_at > now());

-- Allow admins and support to view all advertisements
CREATE POLICY "Admins and support can view all advertisements"
ON public.advertisements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (is_admin = true OR is_support = true)
  )
);

-- Allow users to view their own advertisements
CREATE POLICY "Users can view own advertisements"
ON public.advertisements
FOR SELECT
USING (auth.uid() = user_id);

-- Function to approve advertisement
CREATE OR REPLACE FUNCTION public.approve_advertisement(ad_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user is admin or support
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (is_admin = true OR is_support = true)
  ) THEN
    RAISE EXCEPTION 'Only admins and support can approve advertisements';
  END IF;

  -- Update advertisement status
  UPDATE public.advertisements
  SET status = 'approved',
      processed_by = auth.uid(),
      processed_at = now()
  WHERE id = ad_id AND status = 'pending';

  -- Notify user
  INSERT INTO public.notifications (user_id, type, from_user_id, message)
  SELECT user_id, 'announcement', auth.uid(), 'Your advertisement has been approved!'
  FROM public.advertisements
  WHERE id = ad_id;
END;
$$;

-- Function to reject advertisement and refund flames
CREATE OR REPLACE FUNCTION public.reject_advertisement(ad_id uuid, reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  ad_user_id uuid;
  ad_cost integer;
BEGIN
  -- Check if user is admin or support
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (is_admin = true OR is_support = true)
  ) THEN
    RAISE EXCEPTION 'Only admins and support can reject advertisements';
  END IF;

  -- Get advertisement details
  SELECT user_id INTO ad_user_id
  FROM public.advertisements
  WHERE id = ad_id AND status = 'pending';

  IF ad_user_id IS NULL THEN
    RAISE EXCEPTION 'Advertisement not found or not pending';
  END IF;

  -- Calculate refund (100 flames per ad)
  ad_cost := 100;

  -- Refund flames
  UPDATE public.profiles
  SET flames = flames + ad_cost
  WHERE id = ad_user_id;

  -- Update advertisement status
  UPDATE public.advertisements
  SET status = 'rejected',
      rejection_reason = reason,
      processed_by = auth.uid(),
      processed_at = now()
  WHERE id = ad_id;

  -- Notify user
  INSERT INTO public.notifications (user_id, type, from_user_id, message)
  VALUES (ad_user_id, 'announcement', auth.uid(), 'Your advertisement was rejected. ' || ad_cost || ' flames have been refunded. Reason: ' || reason);
END;
$$;