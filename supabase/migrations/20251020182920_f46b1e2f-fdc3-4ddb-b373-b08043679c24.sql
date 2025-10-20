-- Add flames column to profiles
ALTER TABLE public.profiles ADD COLUMN flames integer DEFAULT 0 NOT NULL;

-- Create advertisements table
CREATE TABLE public.advertisements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('image', 'video')),
  media_url text NOT NULL,
  thumbnail_url text,
  caption text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  active boolean NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for advertisements
CREATE POLICY "Advertisements are viewable by everyone"
ON public.advertisements
FOR SELECT
USING (active = true AND expires_at > now());

CREATE POLICY "Users can create advertisements"
ON public.advertisements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own advertisements"
ON public.advertisements
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own advertisements"
ON public.advertisements
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_advertisements_expires_at ON public.advertisements(expires_at);
CREATE INDEX idx_advertisements_active ON public.advertisements(active);