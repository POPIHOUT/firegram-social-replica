-- Create trigger function to create like notifications
CREATE OR REPLACE FUNCTION public.create_like_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  content_owner_id uuid;
BEGIN
  -- Get the owner of the liked content
  IF NEW.post_id IS NOT NULL THEN
    SELECT user_id INTO content_owner_id FROM public.posts WHERE id = NEW.post_id;
    
    -- Only create notification if someone else liked the post
    IF content_owner_id IS NOT NULL AND content_owner_id != NEW.user_id THEN
      INSERT INTO public.notifications (user_id, type, from_user_id, post_id)
      VALUES (content_owner_id, 'like', NEW.user_id, NEW.post_id);
    END IF;
  ELSIF NEW.reel_id IS NOT NULL THEN
    SELECT user_id INTO content_owner_id FROM public.reels WHERE id = NEW.reel_id;
    
    -- Only create notification if someone else liked the reel
    IF content_owner_id IS NOT NULL AND content_owner_id != NEW.user_id THEN
      INSERT INTO public.notifications (user_id, type, from_user_id, reel_id)
      VALUES (content_owner_id, 'like', NEW.user_id, NEW.reel_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on likes table
CREATE TRIGGER on_like_created
AFTER INSERT ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.create_like_notification();

-- Create trigger function to create comment notifications
CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  content_owner_id uuid;
BEGIN
  -- Get the owner of the commented content
  IF NEW.post_id IS NOT NULL THEN
    SELECT user_id INTO content_owner_id FROM public.posts WHERE id = NEW.post_id;
    
    -- Only create notification if someone else commented
    IF content_owner_id IS NOT NULL AND content_owner_id != NEW.user_id THEN
      INSERT INTO public.notifications (user_id, type, from_user_id, post_id)
      VALUES (content_owner_id, 'comment', NEW.user_id, NEW.post_id);
    END IF;
  ELSIF NEW.reel_id IS NOT NULL THEN
    SELECT user_id INTO content_owner_id FROM public.reels WHERE id = NEW.reel_id;
    
    -- Only create notification if someone else commented
    IF content_owner_id IS NOT NULL AND content_owner_id != NEW.user_id THEN
      INSERT INTO public.notifications (user_id, type, from_user_id, reel_id)
      VALUES (content_owner_id, 'comment', NEW.user_id, NEW.reel_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on comments table
CREATE TRIGGER on_comment_created
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.create_comment_notification();