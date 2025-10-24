-- Update validation function to allow LukasAdamovec to have system_manager role
CREATE OR REPLACE FUNCTION public.validate_system_manager_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_username TEXT;
BEGIN
  IF NEW.role = 'system_manager' THEN
    -- Get username from profiles
    SELECT username INTO user_username
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    IF user_username NOT IN ('Pepovinea', 'Jetomit_Bio_Offi', 'LukasAdamovec') THEN
      RAISE EXCEPTION 'System Manager role can only be assigned to Pepovinea, Jetomit_Bio_Offi or LukasAdamovec';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;