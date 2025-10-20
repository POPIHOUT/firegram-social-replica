-- Fix storage RLS policy for stories uploads to reels bucket
CREATE POLICY "Users can upload stories to reels bucket"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'reels' 
  AND auth.uid() IS NOT NULL 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Update existing upload policy to be more inclusive
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;

-- Create more general upload policies
CREATE POLICY "Authenticated users can upload to reels"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'reels' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update in reels"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'reels' AND auth.uid() IS NOT NULL);

-- Add foreign key back to stories table but reference profiles instead of auth.users
ALTER TABLE public.stories 
ADD CONSTRAINT fk_stories_user_profiles 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;