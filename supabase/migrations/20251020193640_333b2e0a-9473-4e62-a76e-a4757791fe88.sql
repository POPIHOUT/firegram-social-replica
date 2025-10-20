-- Create effects table
CREATE TABLE IF NOT EXISTS public.effects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price integer NOT NULL CHECK (price >= 50 AND price <= 150),
  effect_type text NOT NULL,
  icon text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on effects
ALTER TABLE public.effects ENABLE ROW LEVEL SECURITY;

-- Everyone can view effects
CREATE POLICY "Effects are viewable by everyone"
ON public.effects
FOR SELECT
USING (true);

-- Create user_effects table (purchased effects)
CREATE TABLE IF NOT EXISTS public.user_effects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  effect_id uuid NOT NULL REFERENCES public.effects(id) ON DELETE CASCADE,
  purchased_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, effect_id)
);

-- Enable RLS on user_effects
ALTER TABLE public.user_effects ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchased effects
CREATE POLICY "Users can view own effects"
ON public.user_effects
FOR SELECT
USING (auth.uid() = user_id);

-- Users can purchase effects
CREATE POLICY "Users can purchase effects"
ON public.user_effects
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add selected effect to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS selected_effect_id uuid REFERENCES public.effects(id);

-- Function to purchase effect
CREATE OR REPLACE FUNCTION public.purchase_effect(effect_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_flames integer;
  effect_price integer;
  user_premium boolean;
BEGIN
  -- Check if user is premium
  SELECT is_premium, flames INTO user_premium, user_flames
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT user_premium THEN
    RAISE EXCEPTION 'You need premium to purchase effects';
  END IF;

  -- Check if user already owns this effect
  IF EXISTS (
    SELECT 1 FROM public.user_effects 
    WHERE user_id = auth.uid() AND effect_id = effect_uuid
  ) THEN
    RAISE EXCEPTION 'You already own this effect';
  END IF;

  -- Get effect price
  SELECT price INTO effect_price
  FROM public.effects
  WHERE id = effect_uuid;

  IF effect_price IS NULL THEN
    RAISE EXCEPTION 'Effect not found';
  END IF;

  -- Check if user has enough flames
  IF user_flames < effect_price THEN
    RAISE EXCEPTION 'Not enough flames. You need % flames.', effect_price;
  END IF;

  -- Deduct flames and add effect
  UPDATE public.profiles
  SET flames = flames - effect_price
  WHERE id = auth.uid();

  INSERT INTO public.user_effects (user_id, effect_id)
  VALUES (auth.uid(), effect_uuid);
END;
$$;

-- Function to cancel premium
CREATE OR REPLACE FUNCTION public.cancel_premium()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET is_premium = false,
      premium_until = NULL,
      selected_effect_id = NULL
  WHERE id = auth.uid();
END;
$$;

-- Insert default effects
INSERT INTO public.effects (name, description, price, effect_type, icon) VALUES
('Snow Storm', 'Beautiful snowflakes falling on your profile', 75, 'snow', '❄️'),
('Heart Rain', 'Romantic hearts floating around', 100, 'hearts', '💕'),
('Star Shine', 'Sparkling stars everywhere', 85, 'stars', '✨'),
('Bubble Float', 'Colorful bubbles rising up', 60, 'bubbles', '🫧'),
('Autumn Leaves', 'Falling autumn leaves effect', 70, 'leaves', '🍂'),
('Confetti Party', 'Celebration confetti explosion', 120, 'confetti', '🎉'),
('Lightning Strike', 'Electric lightning effect', 150, 'lightning', '⚡'),
('Cherry Blossoms', 'Japanese sakura petals', 95, 'sakura', '🌸'),
('Money Rain', 'Dollar bills falling down', 130, 'money', '💵'),
('Emoji Storm', 'Random emojis flying around', 80, 'emojis', '😎')
ON CONFLICT DO NOTHING;