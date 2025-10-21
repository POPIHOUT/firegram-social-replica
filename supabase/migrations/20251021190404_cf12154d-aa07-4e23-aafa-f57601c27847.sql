-- Create update_locks table
CREATE TABLE IF NOT EXISTS public.update_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  reason TEXT NOT NULL,
  locked_until TIMESTAMP WITH TIME ZONE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.update_locks ENABLE ROW LEVEL SECURITY;

-- Policies for update_locks
CREATE POLICY "Everyone can view active locks"
ON public.update_locks
FOR SELECT
USING (active = true AND locked_until > now());

CREATE POLICY "Admins can create locks"
ON public.update_locks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can update locks"
ON public.update_locks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Create update_announcements table
CREATE TABLE IF NOT EXISTS public.update_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.update_announcements ENABLE ROW LEVEL SECURITY;

-- Policies for update_announcements
CREATE POLICY "Everyone can view active announcements"
ON public.update_announcements
FOR SELECT
USING (active = true);

CREATE POLICY "Admins can create announcements"
ON public.update_announcements
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can update announcements"
ON public.update_announcements
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Create table to track which users have seen announcements
CREATE TABLE IF NOT EXISTS public.user_announcement_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  announcement_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

-- Enable RLS
ALTER TABLE public.user_announcement_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own announcement views"
ON public.user_announcement_views
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own announcement views"
ON public.user_announcement_views
FOR INSERT
WITH CHECK (auth.uid() = user_id);