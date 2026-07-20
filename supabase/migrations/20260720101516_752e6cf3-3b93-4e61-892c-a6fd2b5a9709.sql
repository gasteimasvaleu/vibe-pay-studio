
-- Resolver perfil ativo do usuário (fallback = perfil pago)
CREATE OR REPLACE FUNCTION public.resolve_active_profile(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT active_profile_id FROM public.profiles WHERE user_id = _user_id),
    public.default_paid_profile(_user_id)
  );
$$;

-- Trigger genérico para publications
CREATE OR REPLACE FUNCTION public.publications_fill_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.creator_profile_id IS NULL AND NEW.author_id IS NOT NULL THEN
    NEW.creator_profile_id := public.resolve_active_profile(NEW.author_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_publications_fill_profile ON public.publications;
CREATE TRIGGER trg_publications_fill_profile
  BEFORE INSERT ON public.publications
  FOR EACH ROW EXECUTE FUNCTION public.publications_fill_profile();

-- Trigger genérico para tips
CREATE OR REPLACE FUNCTION public.tips_fill_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.creator_profile_id IS NULL AND NEW.creator_id IS NOT NULL THEN
    NEW.creator_profile_id := public.resolve_active_profile(NEW.creator_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tips_fill_profile ON public.tips;
CREATE TRIGGER trg_tips_fill_profile
  BEFORE INSERT ON public.tips
  FOR EACH ROW EXECUTE FUNCTION public.tips_fill_profile();

-- Trigger para chat_message_unlocks
CREATE OR REPLACE FUNCTION public.chat_unlocks_fill_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.creator_profile_id IS NULL AND NEW.creator_id IS NOT NULL THEN
    NEW.creator_profile_id := public.resolve_active_profile(NEW.creator_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_unlocks_fill_profile ON public.chat_message_unlocks;
CREATE TRIGGER trg_chat_unlocks_fill_profile
  BEFORE INSERT ON public.chat_message_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.chat_unlocks_fill_profile();

-- Trigger para video_calls
CREATE OR REPLACE FUNCTION public.video_calls_fill_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.creator_profile_id IS NULL AND NEW.creator_id IS NOT NULL THEN
    NEW.creator_profile_id := public.resolve_active_profile(NEW.creator_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_video_calls_fill_profile ON public.video_calls;
CREATE TRIGGER trg_video_calls_fill_profile
  BEFORE INSERT ON public.video_calls
  FOR EACH ROW EXECUTE FUNCTION public.video_calls_fill_profile();

-- Trigger para publication_unlocks (usa author da publicação)
CREATE OR REPLACE FUNCTION public.publication_unlocks_fill_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _author UUID;
  _pub_profile UUID;
BEGIN
  IF NEW.creator_profile_id IS NULL THEN
    SELECT author_id, creator_profile_id INTO _author, _pub_profile
      FROM public.publications WHERE id = NEW.publication_id;
    NEW.creator_profile_id := COALESCE(_pub_profile, public.resolve_active_profile(_author));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_publication_unlocks_fill_profile ON public.publication_unlocks;
CREATE TRIGGER trg_publication_unlocks_fill_profile
  BEFORE INSERT ON public.publication_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.publication_unlocks_fill_profile();

-- Trigger para subscriptions
CREATE OR REPLACE FUNCTION public.subscriptions_fill_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.creator_profile_id IS NULL AND NEW.creator_id IS NOT NULL THEN
    NEW.creator_profile_id := public.resolve_active_profile(NEW.creator_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_fill_profile ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_fill_profile
  BEFORE INSERT ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.subscriptions_fill_profile();
