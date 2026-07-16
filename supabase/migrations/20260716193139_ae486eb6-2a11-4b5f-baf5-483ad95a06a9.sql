
-- Profile welcome fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS chat_welcome_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS chat_welcome_message text,
  ADD COLUMN IF NOT EXISTS chat_welcome_media jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS chat_welcome_tag text;

-- chat_messages metadata
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Storage policies for chat-welcome/<uid>/ prefix in publications bucket
CREATE POLICY "welcome_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'publications'
    AND (storage.foldername(name))[1] = 'chat-welcome'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
CREATE POLICY "welcome_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'publications'
    AND (storage.foldername(name))[1] = 'chat-welcome'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
CREATE POLICY "welcome_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'publications'
    AND (storage.foldername(name))[1] = 'chat-welcome'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Trigger to auto-send welcome message on subscription activation
CREATE OR REPLACE FUNCTION public.send_welcome_message_on_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prof RECORD;
  _thread_id uuid;
  _a uuid;
  _b uuid;
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND OLD.current_period_end IS NOT DISTINCT FROM NEW.current_period_end THEN
    RETURN NEW;
  END IF;

  SELECT chat_welcome_enabled, chat_welcome_message, chat_welcome_media, chat_welcome_tag
    INTO _prof
    FROM public.profiles
    WHERE user_id = NEW.creator_id;

  IF NOT COALESCE(_prof.chat_welcome_enabled, false) THEN
    RETURN NEW;
  END IF;

  IF COALESCE(trim(_prof.chat_welcome_message), '') = ''
     AND (_prof.chat_welcome_media IS NULL OR jsonb_array_length(_prof.chat_welcome_media) = 0) THEN
    RETURN NEW;
  END IF;

  IF NEW.creator_id < NEW.subscriber_id THEN
    _a := NEW.creator_id; _b := NEW.subscriber_id;
  ELSE
    _a := NEW.subscriber_id; _b := NEW.creator_id;
  END IF;

  SELECT id INTO _thread_id FROM public.chat_threads WHERE user_a = _a AND user_b = _b;
  IF _thread_id IS NULL THEN
    INSERT INTO public.chat_threads (user_a, user_b) VALUES (_a, _b) RETURNING id INTO _thread_id;
  END IF;

  INSERT INTO public.chat_messages (thread_id, sender_id, content, price_cents, metadata)
  VALUES (
    _thread_id,
    NEW.creator_id,
    COALESCE(_prof.chat_welcome_message, ''),
    0,
    jsonb_build_object(
      'welcome', true,
      'tag', _prof.chat_welcome_tag,
      'media', COALESCE(_prof.chat_welcome_media, '[]'::jsonb)
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_send_welcome_on_subscription ON public.subscriptions;
CREATE TRIGGER trg_send_welcome_on_subscription
  AFTER INSERT OR UPDATE OF status, current_period_end ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.send_welcome_message_on_subscription();
