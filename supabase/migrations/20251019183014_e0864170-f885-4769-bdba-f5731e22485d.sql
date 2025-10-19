-- Add is_verified column to profiles table
ALTER TABLE public.profiles ADD COLUMN is_verified boolean DEFAULT false;