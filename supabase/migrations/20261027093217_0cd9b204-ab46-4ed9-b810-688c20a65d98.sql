DROP POLICY IF EXISTS unlocks_buyer_insert ON public.publication_unlocks;
DROP POLICY IF EXISTS unlocks_buyer_update ON public.publication_unlocks;
DROP POLICY IF EXISTS story_unlocks_insert_own_buyer ON public.story_unlocks;
DROP POLICY IF EXISTS "buyer creates own chat unlock" ON public.chat_message_unlocks;
DROP POLICY IF EXISTS live_tickets_insert_self ON public.live_tickets;
DROP POLICY IF EXISTS live_tickets_update_self_or_creator ON public.live_tickets;
DROP POLICY IF EXISTS "sender creates own tip" ON public.tips;
DROP POLICY IF EXISTS "subscriber creates own sub" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriber updates own sub" ON public.subscriptions;
DROP POLICY IF EXISTS "participants update video call" ON public.video_calls;
DROP POLICY IF EXISTS "Requesters manage own requests" ON public.chat_media_requests;
DROP POLICY IF EXISTS media_req_update_participants ON public.chat_media_requests;
DROP POLICY IF EXISTS "Users can manage their own refund requests" ON public.refund_requests;
CREATE POLICY "Users view own refund requests" ON public.refund_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Quem escreve é usuário comum (não service_role, não função SECURITY DEFINER, não admin)?
CREATE OR REPLACE FUNCTION public.is_end_user_writer()
RETURNS boolean LANGUAGE plpgsql STABLE SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN false; END IF;
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN RETURN false; END IF;
  RETURN true;
END $$;

-- Guarda genérica: usuário comum nunca grava compra paga / com transação.
CREATE OR REPLACE FUNCTION public.guard_payment_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE j jsonb; o jsonb;
BEGIN
  IF NOT public.is_end_user_writer() THEN RETURN NEW; END IF;
  j := to_jsonb(NEW);
  o := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  IF (j->>'transaction_id') IS NOT NULL AND (j->>'transaction_id') IS DISTINCT FROM (o->>'transaction_id') THEN
    RAISE EXCEPTION 'forbidden: transaction_id' USING ERRCODE = '42501';
  END IF;
  IF (j ? 'status') AND (j->>'status') IN ('paid','active','delivered') AND (j->>'status') IS DISTINCT FROM (o->>'status') THEN
    RAISE EXCEPTION 'forbidden: status' USING ERRCODE = '42501';
  END IF;
  IF (j ? 'payment_status') AND (j->>'payment_status') = 'paid' AND (j->>'payment_status') IS DISTINCT FROM (o->>'payment_status') THEN
    RAISE EXCEPTION 'forbidden: payment_status' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['publication_unlocks','story_unlocks','chat_message_unlocks','live_tickets','tips','subscriptions','video_calls','chat_media_requests'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS aaa_guard_payment_write ON public.%I', t);
    EXECUTE format('CREATE TRIGGER aaa_guard_payment_write BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_payment_write()', t);
  END LOOP;
END $$;

-- Videochamada criada pelo fã: preço sempre do creator; nada de pagamento na criação.
CREATE OR REPLACE FUNCTION public.video_calls_enforce_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p record; _end_user boolean;
BEGIN
  _end_user := current_user IN ('authenticated','anon') AND NOT (auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'admin'));
  IF NOT _end_user THEN RETURN NEW; END IF;
  NEW.payment_status := 'pending'; NEW.transaction_id := NULL; NEW.provider_ref := NULL;
  NEW.room_url := NULL; NEW.started_at := NULL; NEW.ended_at := NULL;
  IF NEW.requester_id = auth.uid() THEN
    SELECT video_call_enabled, video_call_price_cents INTO _p FROM public.profiles WHERE user_id = NEW.creator_id;
    IF NOT FOUND OR NOT COALESCE(_p.video_call_enabled,false) THEN
      RAISE EXCEPTION 'creator does not accept video calls' USING ERRCODE='42501';
    END IF;
    NEW.price_cents := GREATEST(0, COALESCE(_p.video_call_price_cents,0));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS aab_video_calls_enforce_insert ON public.video_calls;
CREATE TRIGGER aab_video_calls_enforce_insert BEFORE INSERT ON public.video_calls FOR EACH ROW EXECUTE FUNCTION public.video_calls_enforce_insert();

-- Pedido de mídia paga: sempre pendente, preço dentro da faixa do creator.
CREATE OR REPLACE FUNCTION public.chat_media_requests_enforce_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p record;
BEGIN
  IF NOT (current_user IN ('authenticated','anon') AND NOT (auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'admin'))) THEN RETURN NEW; END IF;
  NEW.status := 'pending_payment'; NEW.transaction_id := NULL; NEW.paid_at := NULL;
  NEW.delivered_at := NULL; NEW.provider_ref := NULL; NEW.media := NULL; NEW.message_id := NULL;
  SELECT paid_dm_upload_enabled, paid_dm_upload_min_cents, paid_dm_upload_max_cents INTO _p FROM public.profiles WHERE user_id = NEW.creator_id;
  IF NOT FOUND OR NOT COALESCE(_p.paid_dm_upload_enabled,false) THEN
    RAISE EXCEPTION 'creator does not accept paid media' USING ERRCODE='42501';
  END IF;
  IF NEW.price_cents IS NULL OR NEW.price_cents < COALESCE(_p.paid_dm_upload_min_cents,1)
     OR (_p.paid_dm_upload_max_cents IS NOT NULL AND NEW.price_cents > _p.paid_dm_upload_max_cents) THEN
    RAISE EXCEPTION 'price out of range' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS aab_chat_media_requests_enforce_insert ON public.chat_media_requests;
CREATE TRIGGER aab_chat_media_requests_enforce_insert BEFORE INSERT ON public.chat_media_requests FOR EACH ROW EXECUTE FUNCTION public.chat_media_requests_enforce_insert();

-- Moderação de publicações: só admin/servidor.
CREATE OR REPLACE FUNCTION public.publications_protect_moderation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT public.is_end_user_writer() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.moderation_status := 'approved'; NEW.moderation_note := NULL;
  ELSIF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
     OR NEW.moderation_note IS DISTINCT FROM OLD.moderation_note THEN
    RAISE EXCEPTION 'forbidden: moderation' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS aaa_publications_protect_moderation ON public.publications;
CREATE TRIGGER aaa_publications_protect_moderation BEFORE INSERT OR UPDATE ON public.publications FOR EACH ROW EXECUTE FUNCTION public.publications_protect_moderation();

REVOKE EXECUTE ON FUNCTION public.guard_payment_write(), public.video_calls_enforce_insert(), public.chat_media_requests_enforce_insert(), public.publications_protect_moderation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_end_user_writer() TO authenticated, anon;