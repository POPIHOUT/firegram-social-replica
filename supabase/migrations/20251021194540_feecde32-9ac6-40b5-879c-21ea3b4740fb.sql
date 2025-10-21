-- Update validation trigger to allow both Pepovinea and Jetomit_Bio_Offi to have system_manager role
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
    
    IF user_username NOT IN ('Pepovinea', 'Jetomit_Bio_Offi') THEN
      RAISE EXCEPTION 'System Manager role can only be assigned to Pepovinea or Jetomit_Bio_Offi';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add system_manager role to Jetomit_Bio_Offi
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'system_manager'::app_role
FROM public.profiles
WHERE username = 'Jetomit_Bio_Offi'
ON CONFLICT (user_id, role) DO NOTHING;