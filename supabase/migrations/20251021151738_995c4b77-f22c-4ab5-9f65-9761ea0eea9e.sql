-- Add conversation_id to notifications for message notifications
ALTER TABLE public.notifications
ADD COLUMN conversation_id UUID REFERENCES public.conversations(id);

-- Create trigger function for message notifications
CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recipient_id uuid;
BEGIN
  -- Get the other participant in the conversation (the recipient)
  SELECT user_id INTO recipient_id
  FROM public.conversation_participants
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id
  LIMIT 1;
  
  -- Only create notification if recipient exists and is not the sender
  IF recipient_id IS NOT NULL AND recipient_id != NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, type, from_user_id, conversation_id)
    VALUES (recipient_id, 'message', NEW.sender_id, NEW.conversation_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on messages table
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_message_notification();