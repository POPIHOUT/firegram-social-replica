-- Make post_id nullable since comments can be on either posts or reels
ALTER TABLE public.comments ALTER COLUMN post_id DROP NOT NULL;

-- Add check constraint to ensure comment has either post_id or reel_id, but not both
ALTER TABLE public.comments ADD CONSTRAINT comments_post_or_reel_check CHECK (
  (post_id IS NOT NULL AND reel_id IS NULL) OR
  (post_id IS NULL AND reel_id IS NOT NULL)
);