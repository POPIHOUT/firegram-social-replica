-- Add columns for user moderation
ALTER TABLE public.profiles ADD COLUMN banned boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN suspended boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN suspended_until timestamp with time zone DEFAULT null;
ALTER TABLE public.profiles ADD COLUMN ban_reason text DEFAULT null;
ALTER TABLE public.profiles ADD COLUMN suspended_reason text DEFAULT null;