-- Remove the duplicate is_read column since we already have 'read' column
ALTER TABLE public.notifications
DROP COLUMN IF EXISTS is_read;

-- Ensure the read column has proper default
ALTER TABLE public.notifications
ALTER COLUMN read SET DEFAULT false;