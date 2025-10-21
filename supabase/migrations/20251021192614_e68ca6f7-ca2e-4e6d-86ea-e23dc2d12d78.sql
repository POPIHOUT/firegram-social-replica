-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'support', 'system_manager');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to prevent adding system_manager to anyone except Pepovinea
CREATE OR REPLACE FUNCTION public.validate_system_manager_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_username TEXT;
BEGIN
  IF NEW.role = 'system_manager' THEN
    -- Get username from profiles
    SELECT username INTO user_username
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    IF user_username != 'Pepovinea' THEN
      RAISE EXCEPTION 'System Manager role can only be assigned to Pepovinea';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger to validate system_manager role assignment
CREATE TRIGGER validate_system_manager_before_insert
BEFORE INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.validate_system_manager_role();

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Update RLS policies for update_locks - only system_manager can create
DROP POLICY IF EXISTS "Admins can create locks" ON public.update_locks;
CREATE POLICY "System managers can create locks"
ON public.update_locks
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'system_manager'));

DROP POLICY IF EXISTS "Admins can update locks" ON public.update_locks;
CREATE POLICY "System managers can update locks"
ON public.update_locks
FOR UPDATE
USING (public.has_role(auth.uid(), 'system_manager'));

-- Update RLS policies for update_announcements - only system_manager can create
DROP POLICY IF EXISTS "Admins can create announcements" ON public.update_announcements;
CREATE POLICY "System managers can create announcements"
ON public.update_announcements
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'system_manager'));

DROP POLICY IF EXISTS "Admins can update announcements" ON public.update_announcements;
CREATE POLICY "System managers can update announcements"
ON public.update_announcements
FOR UPDATE
USING (public.has_role(auth.uid(), 'system_manager'));

DROP POLICY IF EXISTS "Admins can delete announcements" ON public.update_announcements;
CREATE POLICY "System managers can delete announcements"
ON public.update_announcements
FOR DELETE
USING (public.has_role(auth.uid(), 'system_manager'));

-- Insert system_manager role for Pepovinea
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'system_manager'::app_role
FROM public.profiles
WHERE username = 'Pepovinea'
ON CONFLICT (user_id, role) DO NOTHING;