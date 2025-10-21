-- Create SAC codes table
CREATE TABLE public.sac_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.sac_codes ENABLE ROW LEVEL SECURITY;

-- SAC codes are viewable by everyone (to validate codes)
CREATE POLICY "SAC codes are viewable by everyone"
ON public.sac_codes
FOR SELECT
USING (active = true);

-- Admins can create SAC codes
CREATE POLICY "Admins can create SAC codes"
ON public.sac_codes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Admins can update SAC codes
CREATE POLICY "Admins can update SAC codes"
ON public.sac_codes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Admins can delete SAC codes
CREATE POLICY "Admins can delete SAC codes"
ON public.sac_codes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Add SAC code tracking to flame purchases
ALTER TABLE public.flame_purchases
ADD COLUMN sac_code TEXT,
ADD COLUMN creator_id UUID REFERENCES public.profiles(id),
ADD COLUMN discount_percent NUMERIC DEFAULT 0,
ADD COLUMN creator_commission_flames INTEGER DEFAULT 0;