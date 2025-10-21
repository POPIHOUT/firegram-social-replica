-- Create table to store which ad was shown to which user for which story group
CREATE TABLE public.story_ad_associations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  story_owner_id UUID NOT NULL,
  ad_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.story_ad_associations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own associations
CREATE POLICY "Users can view own associations"
ON public.story_ad_associations
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can create their own associations
CREATE POLICY "Users can create associations"
ON public.story_ad_associations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_story_ad_associations_user_owner ON public.story_ad_associations(user_id, story_owner_id);