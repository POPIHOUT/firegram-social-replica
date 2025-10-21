-- Add foreign key for notifications from_user_id
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_from_user_id_fkey
FOREIGN KEY (from_user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Create trigger function to create follow notifications
CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, from_user_id)
  VALUES (NEW.following_id, 'follow', NEW.follower_id);
  RETURN NEW;
END;
$$;

-- Create trigger on follows table
CREATE TRIGGER on_follow_created
AFTER INSERT ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.create_follow_notification();