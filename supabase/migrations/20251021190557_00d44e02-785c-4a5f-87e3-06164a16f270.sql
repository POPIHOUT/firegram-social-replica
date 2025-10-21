-- Add foreign key constraints for update_locks
ALTER TABLE public.update_locks
ADD CONSTRAINT update_locks_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Add foreign key constraints for update_announcements
ALTER TABLE public.update_announcements
ADD CONSTRAINT update_announcements_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Add foreign key constraints for user_announcement_views
ALTER TABLE public.user_announcement_views
ADD CONSTRAINT user_announcement_views_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

ALTER TABLE public.user_announcement_views
ADD CONSTRAINT user_announcement_views_announcement_id_fkey
FOREIGN KEY (announcement_id)
REFERENCES public.update_announcements(id)
ON DELETE CASCADE;