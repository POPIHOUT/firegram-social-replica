-- Fix RLS policy for conversations to allow creating new conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also ensure users can view conversations they're participating in
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.conversation_participants 
    WHERE conversation_id = conversations.id 
    AND user_id = auth.uid()
  )
);