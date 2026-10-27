
-- ============ 1. LIVES: segredos da Cloudflare em tabela fechada ============
CREATE TABLE public.live_session_secrets (
  live_id uuid PRIMARY KEY REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  cf_live_input_id text,
  cf_webrtc_url text,
  cf_webrtc_play_url text,
  cf_playback_hls text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.live_session_secrets FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.live_session_secrets TO service_role;
ALTER TABLE public.live_session_secrets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER live_session_secrets_set_updated_at BEFORE UPDATE ON public.live_session_secrets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.live_session_secrets (live_id, cf_live_input_id, cf_webrtc_url, cf_webrtc_play_url, cf_playback_hls)
SELECT id, cf_live_input_id, cf_webrtc_url, cf_webrtc_play_url, cf_playback_hls
FROM public.live_sessions
WHERE cf_live_input_id IS NOT NULL OR cf_webrtc_url IS NOT NULL OR cf_webrtc_play_url IS NOT NULL OR cf_playback_hls IS NOT NULL;

ALTER TABLE public.live_sessions
  DROP COLUMN cf_live_input_id,
  DROP COLUMN cf_webrtc_url,
  DROP COLUMN cf_webrtc_play_url,
  DROP COLUMN cf_playback_hls;

DROP POLICY IF EXISTS live_sessions_select_all ON public.live_sessions;

-- ============ 2. CHAT: leitura mascarada, escrita restrita ============
CREATE OR REPLACE FUNCTION public.chat_mask_metadata(md jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN md IS NULL THEN NULL ELSE jsonb_strip_nulls(jsonb_build_object(
    'welcome', md->'welcome',
    'tag', md->'tag',
    'paidUpload', md->'paidUpload',
    'media', (SELECT jsonb_agg(jsonb_build_object('kind', e->'kind', 'mime', e->'mime', 'durationSec', e->'durationSec'))
              FROM jsonb_array_elements(CASE WHEN jsonb_typeof(md->'media') = 'array' THEN md->'media' ELSE '[]'::jsonb END) e)
  )) END
$$;

CREATE VIEW public.chat_messages_safe WITH (security_barrier = true) AS
SELECT m.id, m.thread_id, m.sender_id, m.read_at, m.created_at, m.price_cents,
       m.deleted_at, m.reply_to_id, m.creator_profile_id,
       CASE WHEN v.ok THEN m.content ELSE '' END AS content,
       CASE WHEN v.ok THEN m.metadata ELSE public.chat_mask_metadata(m.metadata) END AS metadata
FROM public.chat_messages m
CROSS JOIN LATERAL (
  SELECT (COALESCE(m.price_cents, 0) <= 0
          OR m.sender_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.chat_message_unlocks u
                     WHERE u.message_id = m.id AND u.buyer_id = auth.uid() AND u.status = 'paid')) AS ok
) v
WHERE auth.uid() IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = m.thread_id AND auth.uid() IN (t.user_a, t.user_b))
  AND NOT (m.sender_id <> auth.uid() AND public.is_restricted(auth.uid(), m.sender_id));

REVOKE ALL ON public.chat_messages_safe FROM anon, PUBLIC;
GRANT SELECT ON public.chat_messages_safe TO authenticated;
GRANT SELECT ON public.chat_messages_safe TO service_role;

-- Sem leitura direta de content/metadata
REVOKE SELECT ON public.chat_messages FROM anon, authenticated;
GRANT SELECT (id, thread_id, sender_id, read_at, created_at, price_cents, deleted_at, reply_to_id, creator_profile_id)
  ON public.chat_messages TO authenticated;

-- Realtime de mensagens não passa mais pelo canal (payload trazia o conteúdo)
ALTER PUBLICATION supabase_realtime DROP TABLE public.chat_messages;

CREATE OR REPLACE FUNCTION public.chat_messages_touch_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.chat_threads SET updated_at = now() WHERE id = NEW.thread_id;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.chat_messages_touch_thread() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER chat_messages_touch_thread AFTER UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.chat_messages_touch_thread();

CREATE OR REPLACE FUNCTION public.chat_messages_guard_write()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT public.is_end_user_writer() THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.price_cents, 0) <> 0 THEN
      RAISE EXCEPTION 'mensagens pagas só pelo servidor' USING ERRCODE = '42501';
    END IF;
    IF NEW.metadata IS NOT NULL AND NEW.metadata <> '{}'::jsonb THEN
      RAISE EXCEPTION 'mensagens com mídia só pelo servidor' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.thread_id IS DISTINCT FROM OLD.thread_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id OR NEW.price_cents IS DISTINCT FROM OLD.price_cents
     OR NEW.metadata IS DISTINCT FROM OLD.metadata OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.reply_to_id IS DISTINCT FROM OLD.reply_to_id OR NEW.creator_profile_id IS DISTINCT FROM OLD.creator_profile_id THEN
    RAISE EXCEPTION 'alteração não permitida' USING ERRCODE = '42501';
  END IF;

  IF OLD.sender_id = auth.uid() THEN
    IF NEW.read_at IS DISTINCT FROM OLD.read_at THEN
      RAISE EXCEPTION 'alteração não permitida' USING ERRCODE = '42501';
    END IF;
    IF NEW.content IS DISTINCT FROM OLD.content AND COALESCE(OLD.price_cents, 0) > 0 THEN
      RAISE EXCEPTION 'alteração não permitida' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NEW.content IS DISTINCT FROM OLD.content OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
      RAISE EXCEPTION 'só é possível marcar como lida' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER aaa_chat_messages_guard_write BEFORE INSERT OR UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.chat_messages_guard_write();

-- ============ 3. Caminhos de mídia: só da pasta do próprio autor ============
CREATE OR REPLACE FUNCTION public.media_path_owned_by(_val text, _owner uuid)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE p text; i int;
BEGIN
  IF _val IS NULL OR _val = '' THEN RETURN true; END IF;
  i := position('/object/sign/publications/' in _val);
  IF i > 0 THEN
    p := split_part(substr(_val, i + length('/object/sign/publications/')), '?', 1);
  ELSIF _val ~* '^(https?:|blob:|data:)' THEN
    RETURN true; -- link externo: nunca é re-assinado
  ELSE
    p := _val;
  END IF;
  RETURN split_part(p, '/', 2) = _owner::text;
END $$;

CREATE OR REPLACE FUNCTION public.publication_media_guard_path()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE _owner uuid;
BEGIN
  IF NOT public.is_end_user_writer() THEN RETURN NEW; END IF;
  SELECT author_id INTO _owner FROM public.publications WHERE id = NEW.publication_id;
  IF _owner IS NULL OR NOT public.media_path_owned_by(NEW.url, _owner) OR NOT public.media_path_owned_by(NEW.storage_path, _owner) THEN
    RAISE EXCEPTION 'arquivo fora da sua pasta' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER aaa_publication_media_guard_path BEFORE INSERT OR UPDATE ON public.publication_media
  FOR EACH ROW EXECUTE FUNCTION public.publication_media_guard_path();

CREATE OR REPLACE FUNCTION public.publications_guard_path()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT public.is_end_user_writer() THEN RETURN NEW; END IF;
  IF NOT public.media_path_owned_by(NEW.preview_url, NEW.author_id)
     OR NOT public.media_path_owned_by(NEW.preview_storage_path, NEW.author_id)
     OR NOT public.media_path_owned_by(NEW.audio_url, NEW.author_id)
     OR NOT public.media_path_owned_by(NEW.audio_storage_path, NEW.author_id) THEN
    RAISE EXCEPTION 'arquivo fora da sua pasta' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER aaa_publications_guard_path BEFORE INSERT OR UPDATE ON public.publications
  FOR EACH ROW EXECUTE FUNCTION public.publications_guard_path();

CREATE OR REPLACE FUNCTION public.vault_uploads_guard_path()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT public.is_end_user_writer() THEN RETURN NEW; END IF;
  IF NOT public.media_path_owned_by(NEW.url, NEW.user_id) OR NOT public.media_path_owned_by(NEW.storage_path, NEW.user_id) THEN
    RAISE EXCEPTION 'arquivo fora da sua pasta' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER aaa_vault_uploads_guard_path BEFORE INSERT OR UPDATE ON public.vault_uploads
  FOR EACH ROW EXECUTE FUNCTION public.vault_uploads_guard_path();

-- ============ 4. Videochamada e pedido de mídia: só pelo servidor ============
DROP POLICY IF EXISTS "requester creates video call" ON public.video_calls;
DROP POLICY IF EXISTS "creator creates video call invite" ON public.video_calls;
DROP POLICY IF EXISTS media_req_insert_requester ON public.chat_media_requests;
DROP TRIGGER IF EXISTS aab_video_calls_enforce_insert ON public.video_calls;
DROP TRIGGER IF EXISTS aab_chat_media_requests_enforce_insert ON public.chat_media_requests;
DROP FUNCTION IF EXISTS public.video_calls_enforce_insert();
DROP FUNCTION IF EXISTS public.chat_media_requests_enforce_insert();

-- ============ 6. Cadastro: nunca nasce creator ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  base text;
  candidate text;
  acct text;
begin
  base := coalesce(
    nullif(new.raw_user_meta_data->>'username', ''),
    nullif(new.raw_user_meta_data->>'user_name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'usuario'
  );
  base := translate(
    base,
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
  );
  candidate := public.resolve_available_username(base);

  acct := coalesce(new.raw_user_meta_data->>'account_type', 'subscriber');
  if acct NOT IN ('subscriber','free_creator') then
    acct := 'subscriber';
  end if;

  insert into public.profiles (user_id, username, account_type)
  values (new.id, candidate, acct)
  on conflict (user_id) do nothing;
  return new;
end;
$function$;
