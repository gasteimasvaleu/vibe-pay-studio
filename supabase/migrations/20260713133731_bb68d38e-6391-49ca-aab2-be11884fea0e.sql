
-- Chat monetization: paid message unlocks (PPV messages)
CREATE TABLE public.chat_message_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  status public.transaction_status NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_ref TEXT,
  transaction_id UUID REFERENCES public.transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, buyer_id),
  CHECK (buyer_id <> creator_id)
);

-- Add price_cents to chat_messages so a message can be gated
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS price_cents BIGINT NOT NULL DEFAULT 0 CHECK (price_cents >= 0);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_message_unlocks TO authenticated;
GRANT ALL ON public.chat_message_unlocks TO service_role;
ALTER TABLE public.chat_message_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer sees own chat unlocks" ON public.chat_message_unlocks
  FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = creator_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "buyer creates own chat unlock" ON public.chat_message_unlocks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "admin manages chat unlocks" ON public.chat_message_unlocks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_chat_message_unlocks_updated_at
  BEFORE UPDATE ON public.chat_message_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sync trigger: on paid unlock, create a transactions row
CREATE OR REPLACE FUNCTION public.chat_message_unlocks_sync_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  _split RECORD;
  _tx_id UUID;
  _method public.payment_method;
BEGIN
  IF NEW.status <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' THEN RETURN NEW; END IF;
  IF NEW.transaction_id IS NOT NULL THEN RETURN NEW; END IF;

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.amount_cents::BIGINT);

  _method := CASE
    WHEN NEW.provider IN ('pix','asaas_pix') THEN 'pix'::public.payment_method
    WHEN NEW.provider IN ('credit_card','card','asaas_card') THEN 'credit_card'::public.payment_method
    WHEN NEW.provider = 'wallet' THEN 'wallet'::public.payment_method
    WHEN NEW.provider = 'boleto' THEN 'boleto'::public.payment_method
    ELSE 'manual'::public.payment_method
  END;

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id,
    amount_cents_gross, platform_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref,
    reference_table, reference_id
  ) VALUES (
    'chat_unlock','paid', NEW.buyer_id, NEW.creator_id,
    NEW.amount_cents, _split.platform_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, COALESCE(NEW.provider,'manual'), NEW.provider_ref,
    'chat_message_unlocks', NEW.id
  ) RETURNING id INTO _tx_id;

  NEW.transaction_id := _tx_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chat_message_unlocks_sync_tx
  BEFORE INSERT OR UPDATE ON public.chat_message_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.chat_message_unlocks_sync_transaction();

-- Video calls
CREATE TYPE public.video_call_status AS ENUM ('requested','accepted','declined','cancelled','completed','no_show');

CREATE TABLE public.video_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 15 CHECK (duration_minutes > 0),
  price_cents BIGINT NOT NULL CHECK (price_cents >= 0),
  status public.video_call_status NOT NULL DEFAULT 'requested',
  payment_status public.transaction_status NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_ref TEXT,
  transaction_id UUID REFERENCES public.transactions(id),
  room_url TEXT,
  notes TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (requester_id <> creator_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_calls TO authenticated;
GRANT ALL ON public.video_calls TO service_role;
ALTER TABLE public.video_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read video calls" ON public.video_calls
  FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = creator_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "requester creates video call" ON public.video_calls
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "participants update video call" ON public.video_calls
  FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = creator_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = creator_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "admin manages video calls" ON public.video_calls
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_video_calls_updated_at
  BEFORE UPDATE ON public.video_calls
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.video_calls_sync_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  _split RECORD;
  _tx_id UUID;
  _method public.payment_method;
BEGIN
  IF NEW.payment_status <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.payment_status = 'paid' THEN RETURN NEW; END IF;
  IF NEW.transaction_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.price_cents <= 0 THEN RETURN NEW; END IF;

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.price_cents::BIGINT);

  _method := CASE
    WHEN NEW.provider IN ('pix','asaas_pix') THEN 'pix'::public.payment_method
    WHEN NEW.provider IN ('credit_card','card','asaas_card') THEN 'credit_card'::public.payment_method
    WHEN NEW.provider = 'wallet' THEN 'wallet'::public.payment_method
    WHEN NEW.provider = 'boleto' THEN 'boleto'::public.payment_method
    ELSE 'manual'::public.payment_method
  END;

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id,
    amount_cents_gross, platform_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref,
    reference_table, reference_id,
    metadata
  ) VALUES (
    'video_call','paid', NEW.requester_id, NEW.creator_id,
    NEW.price_cents, _split.platform_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, COALESCE(NEW.provider,'manual'), NEW.provider_ref,
    'video_calls', NEW.id,
    jsonb_build_object('duration_minutes', NEW.duration_minutes, 'scheduled_at', NEW.scheduled_at)
  ) RETURNING id INTO _tx_id;

  NEW.transaction_id := _tx_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_video_calls_sync_tx
  BEFORE INSERT OR UPDATE ON public.video_calls
  FOR EACH ROW EXECUTE FUNCTION public.video_calls_sync_transaction();

-- Creator video call settings on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS video_call_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_call_price_cents BIGINT NOT NULL DEFAULT 0 CHECK (video_call_price_cents >= 0),
  ADD COLUMN IF NOT EXISTS video_call_default_minutes INTEGER NOT NULL DEFAULT 15 CHECK (video_call_default_minutes > 0);
