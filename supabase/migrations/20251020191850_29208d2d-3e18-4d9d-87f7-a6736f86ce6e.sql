-- Add custom background and fire effect settings to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_own_fire_effect boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS custom_background_url text;