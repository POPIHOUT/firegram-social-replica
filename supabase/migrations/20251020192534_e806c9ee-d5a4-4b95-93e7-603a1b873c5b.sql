-- Add toggle for custom background visibility
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_custom_background boolean DEFAULT true;