-- Create storage bucket for reels videos and thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reels',
  'reels',
  true,
  104857600, -- 100MB limit for videos
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Storage policies for reels bucket
CREATE POLICY "Anyone can view reels"
ON storage.objects FOR SELECT
USING (bucket_id = 'reels');

CREATE POLICY "Authenticated users can upload reels"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'reels' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own reels"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'reels' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own reels"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'reels' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);