
-- 1) video_calls: expiração + estados
ALTER TABLE public.video_calls ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TYPE public.video_call_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE public.video_call_status ADD VALUE IF NOT EXISTS 'expired';

-- 2) profiles: envio pago de mídia (solicitação inversa)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS paid_dm_upload_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_dm_upload_min_cents INT NOT NULL DEFAULT 1490,
  ADD COLUMN IF NOT EXISTS paid_dm_upload_max_cents INT NOT NULL DEFAULT 200000;

-- 3) chat_media_requests
CREATE TABLE IF NOT EXISTS public.chat_media_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_profile_id UUID REFERENCES public.creator_profiles(id),
  price_cents INT NOT NULL CHECK (price_cents >= 100 AND price_cents <= 500000),
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment','paid','delivered','expired','cancelled','refunded')),
  provider TEXT,
  provider_ref TEXT,
  payment_intent_id UUID,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  media JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  paid_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.chat_media_requests TO authenticated;
GRANT ALL ON public.chat_media_requests TO service_role;
ALTER TABLE public.chat_media_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_req_select_both_sides" ON public.chat_media_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = creator_id);

CREATE POLICY "media_req_insert_requester" ON public.chat_media_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND auth.uid() <> creator_id);

CREATE POLICY "media_req_update_participants" ON public.chat_media_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = creator_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = creator_id);

CREATE INDEX IF NOT EXISTS chat_media_requests_thread_idx ON public.chat_media_requests(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_media_requests_status_idx ON public.chat_media_requests(status, expires_at);

DROP TRIGGER IF EXISTS chat_media_requests_set_updated_at ON public.chat_media_requests;
CREATE TRIGGER chat_media_requests_set_updated_at
  BEFORE UPDATE ON public.chat_media_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: quando delivered, cria transação de repasse (split padrão 15%)
DROP TRIGGER IF EXISTS chat_media_requests_sync_tx ON public.chat_media_requests;
DROP FUNCTION IF EXISTS public.chat_media_requests_sync_transaction();

CREATE OR REPLACE FUNCTION public.chat_media_requests_sync_transaction()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  _split RECORD; _tx_id UUID; _method public.payment_method; _profile UUID;
BEGIN
  IF NEW.status <> 'delivered' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'delivered' THEN RETURN NEW; END IF;
  IF NEW.price_cents <= 0 THEN RETURN NEW; END IF;

  _profile := COALESCE(NEW.creator_profile_id, public.default_paid_profile(NEW.creator_id));
  IF NEW.creator_profile_id IS NULL THEN NEW.creator_profile_id := _profile; END IF;

  _method := CASE
    WHEN NEW.provider IN ('pix','asaas_pix') THEN 'pix'::public.payment_method
    WHEN NEW.provider IN ('credit_card','card','asaas_card') THEN 'credit_card'::public.payment_method
    WHEN NEW.provider = 'wallet' THEN 'wallet'::public.payment_method
    ELSE 'manual'::public.payment_method
  END;

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.price_cents::BIGINT, 15.00, _method);

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id, creator_profile_id,
    amount_cents_gross, platform_fee_cents, gateway_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref, reference_table, reference_id
  ) VALUES (
    'chat_unlock','paid', NEW.requester_id, NEW.creator_id, _profile,
    NEW.price_cents, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, COALESCE(NEW.provider,'manual'), NEW.provider_ref, 'chat_media_requests', NEW.id
  ) RETURNING id INTO _tx_id;

  NEW.delivered_at := COALESCE(NEW.delivered_at, now());
  RETURN NEW;
END; $$;

CREATE TRIGGER chat_media_requests_sync_tx
  BEFORE UPDATE ON public.chat_media_requests
  FOR EACH ROW EXECUTE FUNCTION public.chat_media_requests_sync_transaction();

-- 4) broadcast_jobs
CREATE TABLE IF NOT EXISTS public.broadcast_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_profile_id UUID REFERENCES public.creator_profiles(id),
  audience TEXT NOT NULL
    CHECK (audience IN ('all_followers','active_subscribers','expired_subscribers','top_buyers')),
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  message TEXT NOT NULL,
  media JSONB NOT NULL DEFAULT '[]'::jsonb,
  price_cents INT NOT NULL DEFAULT 0 CHECK (price_cents >= 0 AND price_cents <= 50000),
  total_recipients INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('running','completed','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.broadcast_jobs TO authenticated;
GRANT ALL ON public.broadcast_jobs TO service_role;
ALTER TABLE public.broadcast_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bj_owner_select" ON public.broadcast_jobs;
CREATE POLICY "bj_owner_select" ON public.broadcast_jobs
  FOR SELECT TO authenticated USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "bj_owner_insert" ON public.broadcast_jobs;
CREATE POLICY "bj_owner_insert" ON public.broadcast_jobs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "bj_owner_update" ON public.broadcast_jobs;
CREATE POLICY "bj_owner_update" ON public.broadcast_jobs
  FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE INDEX IF NOT EXISTS broadcast_jobs_creator_idx ON public.broadcast_jobs(creator_id, created_at DESC);

DROP TRIGGER IF EXISTS broadcast_jobs_set_updated_at ON public.broadcast_jobs;
CREATE TRIGGER broadcast_jobs_set_updated_at
  BEFORE UPDATE ON public.broadcast_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) Storage policies for chat-paid-uploads bucket (bucket created via storage tool)
DROP POLICY IF EXISTS "paid_uploads_insert_requester" ON storage.objects;
DROP POLICY IF EXISTS "paid_uploads_select_participants" ON storage.objects;

CREATE POLICY "paid_uploads_insert_requester" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-paid-uploads'
    AND EXISTS (
      SELECT 1 FROM public.chat_media_requests r
      WHERE r.id::text = split_part(name, '/', 1)
        AND r.requester_id = auth.uid()
        AND r.status = 'paid'
    )
  );

CREATE POLICY "paid_uploads_select_participants" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-paid-uploads'
    AND EXISTS (
      SELECT 1 FROM public.chat_media_requests r
      WHERE r.id::text = split_part(name, '/', 1)
        AND (r.requester_id = auth.uid() OR r.creator_id = auth.uid())
    )
  );
