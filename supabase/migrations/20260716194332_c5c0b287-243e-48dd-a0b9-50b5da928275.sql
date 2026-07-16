ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chat_welcome_price_cents integer NOT NULL DEFAULT 0 CHECK (chat_welcome_price_cents >= 0 AND chat_welcome_price_cents <= 50000);

CREATE OR REPLACE FUNCTION public.send_welcome_message_on_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _prof RECORD;
  _thread_id uuid;
  _a uuid;
  _b uuid;
  _price int;
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND OLD.current_period_end IS NOT DISTINCT FROM NEW.current_period_end THEN
    RETURN NEW;
  END IF;

  SELECT chat_welcome_enabled, chat_welcome_message, chat_welcome_media, chat_welcome_tag, chat_welcome_price_cents
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

  _price := COALESCE(_prof.chat_welcome_price_cents, 0);
  -- Only charge when there is media to unlock
  IF _prof.chat_welcome_media IS NULL OR jsonb_array_length(_prof.chat_welcome_media) = 0 THEN
    _price := 0;
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
    _price,
    jsonb_build_object(
      'welcome', true,
      'tag', _prof.chat_welcome_tag,
      'media', COALESCE(_prof.chat_welcome_media, '[]'::jsonb)
    )
  );

  RETURN NEW;
END;
$function$;