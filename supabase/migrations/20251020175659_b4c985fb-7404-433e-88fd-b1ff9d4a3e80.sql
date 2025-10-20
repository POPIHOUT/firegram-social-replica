-- Fix foreign key constraint in story_views table as well
ALTER TABLE public.story_views DROP CONSTRAINT IF EXISTS fk_viewer;