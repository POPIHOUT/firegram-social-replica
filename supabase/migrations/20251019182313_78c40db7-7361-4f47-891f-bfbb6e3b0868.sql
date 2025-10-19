-- Add comments_count to reels table
ALTER TABLE public.reels ADD COLUMN comments_count integer DEFAULT 0;

-- Add reel_id to comments table (nullable, since comments can be on posts or reels)
ALTER TABLE public.comments ADD COLUMN reel_id uuid REFERENCES public.reels(id) ON DELETE CASCADE;

-- Add check constraint to ensure comment has either post_id or reel_id, but not both
ALTER TABLE public.comments ADD CONSTRAINT comments_content_check CHECK (
  (post_id IS NOT NULL AND reel_id IS NULL) OR
  (post_id IS NULL AND reel_id IS NOT NULL)
);