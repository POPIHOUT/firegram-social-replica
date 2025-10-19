-- Create saved table for bookmarked posts and reels
CREATE TABLE IF NOT EXISTS public.saved (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID,
  reel_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT saved_user_post_unique UNIQUE (user_id, post_id),
  CONSTRAINT saved_user_reel_unique UNIQUE (user_id, reel_id),
  CONSTRAINT saved_either_post_or_reel CHECK (
    (post_id IS NOT NULL AND reel_id IS NULL) OR 
    (post_id IS NULL AND reel_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.saved ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own saved items"
ON public.saved
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts/reels"
ON public.saved
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave their items"
ON public.saved
FOR DELETE
USING (auth.uid() = user_id);