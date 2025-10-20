-- Create frames table for avatar frames
CREATE TABLE public.frames (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.frames ENABLE ROW LEVEL SECURITY;

-- Frames are viewable by everyone
CREATE POLICY "Frames are viewable by everyone"
ON public.frames FOR SELECT
USING (true);

-- Create user_frames table for purchased frames
CREATE TABLE public.user_frames (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  frame_id UUID NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_frames ENABLE ROW LEVEL SECURITY;

-- Users can view own frames
CREATE POLICY "Users can view own frames"
ON public.user_frames FOR SELECT
USING (auth.uid() = user_id);

-- Users can purchase frames
CREATE POLICY "Users can purchase frames"
ON public.user_frames FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add selected_frame_id to profiles
ALTER TABLE public.profiles
ADD COLUMN selected_frame_id UUID REFERENCES public.frames(id);

-- Insert 20 different frame designs
INSERT INTO public.frames (name, description, image_url, price) VALUES
('Dinosaur Roar', 'Prehistoric dinosaur frame', '/frames/dinosaur.png', 50),
('Minecraft World', 'Blocky minecraft style frame', '/frames/minecraft.png', 50),
('Fire Blaze', 'Intense fire and flames', '/frames/fire.png', 75),
('Ocean Waves', 'Deep blue ocean waters', '/frames/ocean.png', 50),
('Space Galaxy', 'Cosmic stars and nebula', '/frames/galaxy.png', 100),
('Neon Glow', 'Bright neon lights', '/frames/neon.png', 75),
('Gold Crown', 'Royal golden crown', '/frames/gold.png', 150),
('Ice Frozen', 'Icy snowflakes and frost', '/frames/ice.png', 75),
('Cherry Blossom', 'Pink sakura petals', '/frames/sakura.png', 50),
('Dragon Scale', 'Mystical dragon scales', '/frames/dragon.png', 100),
('Rainbow Arc', 'Colorful rainbow circle', '/frames/rainbow.png', 50),
('Tech Circuit', 'Futuristic circuit board', '/frames/tech.png', 75),
('Nature Leaf', 'Green leaves and vines', '/frames/nature.png', 50),
('Lightning Storm', 'Electric lightning bolts', '/frames/lightning.png', 100),
('Candy Sweet', 'Sweet candy and sweets', '/frames/candy.png', 50),
('Tribal Pattern', 'Ancient tribal design', '/frames/tribal.png', 75),
('Gem Diamond', 'Sparkling diamonds', '/frames/diamond.png', 150),
('Music Notes', 'Musical notes and symbols', '/frames/music.png', 50),
('Football Sport', 'Sports themed frame', '/frames/sport.png', 50),
('Magic Spell', 'Mystical magic circle', '/frames/magic.png', 100);