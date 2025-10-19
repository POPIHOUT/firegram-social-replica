-- Add images array column to posts table and keep image_url for backward compatibility
ALTER TABLE public.posts ADD COLUMN images TEXT[];

-- Update existing posts to have images array from image_url
UPDATE public.posts SET images = ARRAY[image_url] WHERE images IS NULL AND image_url IS NOT NULL;