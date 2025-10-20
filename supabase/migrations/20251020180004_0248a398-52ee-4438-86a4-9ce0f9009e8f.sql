-- 1) Replace INSERT policy on stories to avoid RLS check failures
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='stories' AND policyname='Users can create own stories'
  ) THEN
    DROP POLICY "Users can create own stories" ON public.stories;
  END IF;
END $$;

CREATE POLICY "Users can create stories"
ON public.stories
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 2) BEFORE INSERT trigger to set user_id and clamp expires_at to max 24h
CREATE OR REPLACE FUNCTION public.stories_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always set owner to current user
  NEW.user_id := auth.uid();

  -- Clamp expiry to max 24 hours from now
  IF NEW.expires_at IS NULL OR NEW.expires_at > (now() + interval '24 hours') THEN
    NEW.expires_at := now() + interval '24 hours';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stories_before_insert ON public.stories;
CREATE TRIGGER trg_stories_before_insert
BEFORE INSERT ON public.stories
FOR EACH ROW
EXECUTE FUNCTION public.stories_before_insert();

-- 3) Simplify INSERT policy for story_views and set viewer_id automatically
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='story_views' AND policyname='Users can create story views'
  ) THEN
    DROP POLICY "Users can create story views" ON public.story_views;
  END IF;
END $$;

CREATE POLICY "Users can create story views"
ON public.story_views
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.story_views_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.viewer_id := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_story_views_before_insert ON public.story_views;
CREATE TRIGGER trg_story_views_before_insert
BEFORE INSERT ON public.story_views
FOR EACH ROW
EXECUTE FUNCTION public.story_views_before_insert();