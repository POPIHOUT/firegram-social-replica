-- Add is_read column to notifications table
ALTER TABLE public.notifications
ADD COLUMN is_read BOOLEAN DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;