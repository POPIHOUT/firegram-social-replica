-- Create function to purchase frames
CREATE OR REPLACE FUNCTION public.purchase_frame(frame_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_flames integer;
  frame_price integer;
  user_premium boolean;
BEGIN
  -- Check if user is premium
  SELECT is_premium, flames INTO user_premium, user_flames
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT user_premium THEN
    RAISE EXCEPTION 'You need premium to purchase frames';
  END IF;

  -- Check if user already owns this frame
  IF EXISTS (
    SELECT 1 FROM public.user_frames 
    WHERE user_id = auth.uid() AND frame_id = frame_uuid
  ) THEN
    RAISE EXCEPTION 'You already own this frame';
  END IF;

  -- Get frame price
  SELECT price INTO frame_price
  FROM public.frames
  WHERE id = frame_uuid;

  IF frame_price IS NULL THEN
    RAISE EXCEPTION 'Frame not found';
  END IF;

  -- Check if user has enough flames
  IF user_flames < frame_price THEN
    RAISE EXCEPTION 'Not enough flames. You need % flames.', frame_price;
  END IF;

  -- Deduct flames and add frame
  UPDATE public.profiles
  SET flames = flames - frame_price
  WHERE id = auth.uid();

  INSERT INTO public.user_frames (user_id, frame_id)
  VALUES (auth.uid(), frame_uuid);
END;
$function$;