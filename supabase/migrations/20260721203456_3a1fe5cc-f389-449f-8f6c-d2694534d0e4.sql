
CREATE OR REPLACE FUNCTION public.fill_active_creator_profile_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  actor_id uuid;
  active_id uuid;
BEGIN
  IF NEW.creator_profile_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'publications' THEN
    actor_id := NEW.author_id;
  ELSIF TG_TABLE_NAME = 'stories' THEN
    actor_id := NEW.creator_id;
  ELSIF TG_TABLE_NAME = 'tips' THEN
    actor_id := NEW.creator_id;
  ELSIF TG_TABLE_NAME = 'follows' THEN
    actor_id := NEW.followee_id;
  ELSIF TG_TABLE_NAME = 'subscriptions' THEN
    actor_id := NEW.creator_id;
  ELSE
    actor_id := NULL;
  END IF;

  IF actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT active_profile_id INTO active_id
  FROM public.profiles
  WHERE user_id = actor_id;

  IF active_id IS NULL THEN
    SELECT id INTO active_id
    FROM public.creator_profiles
    WHERE user_id = actor_id AND kind = 'paid'
    LIMIT 1;
  END IF;

  IF active_id IS NULL THEN
    SELECT id INTO active_id
    FROM public.creator_profiles
    WHERE user_id = actor_id
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  NEW.creator_profile_id := active_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fill_cp_id_publications ON public.publications;
CREATE TRIGGER fill_cp_id_publications
  BEFORE INSERT ON public.publications
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_active_creator_profile_id();

DROP TRIGGER IF EXISTS fill_cp_id_stories ON public.stories;
CREATE TRIGGER fill_cp_id_stories
  BEFORE INSERT ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_active_creator_profile_id();

DROP TRIGGER IF EXISTS fill_cp_id_tips ON public.tips;
CREATE TRIGGER fill_cp_id_tips
  BEFORE INSERT ON public.tips
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_active_creator_profile_id();

DROP TRIGGER IF EXISTS fill_cp_id_follows ON public.follows;
CREATE TRIGGER fill_cp_id_follows
  BEFORE INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_active_creator_profile_id();

DROP TRIGGER IF EXISTS fill_cp_id_subscriptions ON public.subscriptions;
CREATE TRIGGER fill_cp_id_subscriptions
  BEFORE INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_active_creator_profile_id();
