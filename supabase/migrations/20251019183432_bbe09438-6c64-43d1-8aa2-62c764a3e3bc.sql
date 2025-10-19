-- Add is_support column to profiles table for admin access
ALTER TABLE public.profiles ADD COLUMN is_support boolean DEFAULT false;