-- Create function to create or get a 1:1 conversation and add participants
CREATE OR REPLACE FUNCTION public.create_or_get_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_id uuid;
BEGIN
  IF other_user_id IS NULL OR other_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Invalid other_user_id';
  END IF;

  -- Try to find existing 1:1 conversation
  SELECT cp1.conversation_id
    INTO conv_id
  FROM public.conversation_participants cp1
  JOIN public.conversation_participants cp2
    ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = auth.uid()
    AND cp2.user_id = other_user_id
  GROUP BY cp1.conversation_id
  HAVING COUNT(*) = 2
  LIMIT 1;

  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  -- Create new conversation
  INSERT INTO public.conversations DEFAULT VALUES RETURNING id INTO conv_id;

  -- Add both participants
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (conv_id, auth.uid()), (conv_id, other_user_id);

  RETURN conv_id;
END;
$$;

-- Restrict execution to authenticated users
REVOKE ALL ON FUNCTION public.create_or_get_conversation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_or_get_conversation(uuid) TO authenticated;