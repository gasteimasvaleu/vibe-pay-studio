-- ============================================================
-- LIVE SESSIONS: campos adicionais
-- ============================================================
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS price_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cf_live_input_id TEXT,
  ADD COLUMN IF NOT EXISTS cf_webrtc_url TEXT,
  ADD COLUMN IF NOT EXISTS cf_webrtc_play_url TEXT,
  ADD COLUMN IF NOT EXISTS cf_playback_hls TEXT,
  ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.live_sessions
  DROP CONSTRAINT IF EXISTS live_sessions_status_check;
ALTER TABLE public.live_sessions
  ADD CONSTRAINT live_sessions_status_check
  CHECK (status IN ('scheduled','live','ended'));

CREATE INDEX IF NOT EXISTS idx_live_sessions_status_creator
  ON public.live_sessions (status, creator_profile_id)
  WHERE status = 'live';

CREATE INDEX IF NOT EXISTS idx_live_sessions_creator
  ON public.live_sessions (creator_id, created_at DESC);

-- Ajusta RLS: SELECT público (todo user logado vê metadados p/ badge/discovery)
DROP POLICY IF EXISTS "live_sessions_select_all" ON public.live_sessions;
CREATE POLICY "live_sessions_select_all"
  ON public.live_sessions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "live_sessions_owner_insert" ON public.live_sessions;
CREATE POLICY "live_sessions_owner_insert"
  ON public.live_sessions FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "live_sessions_owner_update" ON public.live_sessions;
CREATE POLICY "live_sessions_owner_update"
  ON public.live_sessions FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- LIVE TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.live_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  creator_profile_id UUID REFERENCES public.creator_profiles(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT live_tickets_status_check CHECK (status IN ('pending','paid','failed','refunded','cancelled')),
  CONSTRAINT live_tickets_unique_paid UNIQUE (live_id, buyer_id)
);

GRANT SELECT, INSERT, UPDATE ON public.live_tickets TO authenticated;
GRANT ALL ON public.live_tickets TO service_role;

ALTER TABLE public.live_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_tickets_select_buyer_or_creator"
  ON public.live_tickets FOR SELECT
  TO authenticated
  USING (
    buyer_id = auth.uid()
    OR creator_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "live_tickets_insert_self"
  ON public.live_tickets FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "live_tickets_update_self_or_creator"
  ON public.live_tickets FOR UPDATE
  TO authenticated
  USING (buyer_id = auth.uid() OR creator_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (buyer_id = auth.uid() OR creator_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_live_tickets_live ON public.live_tickets(live_id);
CREATE INDEX IF NOT EXISTS idx_live_tickets_buyer ON public.live_tickets(buyer_id);
CREATE INDEX IF NOT EXISTS idx_live_tickets_creator_profile ON public.live_tickets(creator_profile_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER live_tickets_set_updated_at
  BEFORE UPDATE ON public.live_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TRIGGER: sync com transactions (idêntico ao story_unlocks)
-- ============================================================
CREATE OR REPLACE FUNCTION public.live_tickets_sync_transaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _split RECORD; _tx_id UUID; _method public.payment_method; _profile UUID;
BEGIN
  IF NEW.status <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' THEN RETURN NEW; END IF;
  IF NEW.transaction_id IS NOT NULL THEN RETURN NEW; END IF;

  _profile := COALESCE(NEW.creator_profile_id, public.default_paid_profile(NEW.creator_id));
  IF NEW.creator_profile_id IS NULL THEN NEW.creator_profile_id := _profile; END IF;

  _method := CASE
    WHEN NEW.provider IN ('pix','asaas_pix') THEN 'pix'::public.payment_method
    WHEN NEW.provider IN ('credit_card','card','asaas_card') THEN 'credit_card'::public.payment_method
    WHEN NEW.provider = 'wallet' THEN 'wallet'::public.payment_method
    WHEN NEW.provider = 'boleto' THEN 'boleto'::public.payment_method
    ELSE 'manual'::public.payment_method
  END;

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.amount_cents::BIGINT, 15.00, _method);

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id, creator_profile_id,
    amount_cents_gross, platform_fee_cents, gateway_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref, reference_table, reference_id
  ) VALUES (
    'live_ticket','paid', NEW.buyer_id, NEW.creator_id, _profile,
    NEW.amount_cents, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, COALESCE(NEW.provider,'manual'), NEW.provider_ref, 'live_tickets', NEW.id
  ) RETURNING id INTO _tx_id;

  NEW.transaction_id := _tx_id;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS trg_live_tickets_sync_transaction ON public.live_tickets;
CREATE TRIGGER trg_live_tickets_sync_transaction
  BEFORE INSERT OR UPDATE ON public.live_tickets
  FOR EACH ROW EXECUTE FUNCTION public.live_tickets_sync_transaction();

-- ============================================================
-- ACCESS HELPER
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_live_access(_live_id UUID, _user UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.live_sessions ls WHERE ls.id = _live_id AND ls.creator_id = _user)
      OR public.has_role(_user, 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.live_tickets t
        WHERE t.live_id = _live_id AND t.buyer_id = _user AND t.status = 'paid'
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.has_live_access(UUID, UUID) TO authenticated, service_role;

-- ============================================================
-- pay_with_wallet: novo kind 'live_ticket'
-- Adiciona parâmetro _live_id à assinatura mais completa
-- ============================================================
CREATE OR REPLACE FUNCTION public.pay_with_wallet(
  _kind text,
  _publication_id uuid DEFAULT NULL,
  _message_id uuid DEFAULT NULL,
  _creator_id uuid DEFAULT NULL,
  _plan text DEFAULT NULL,
  _amount_cents integer DEFAULT NULL,
  _message text DEFAULT NULL,
  _story_id uuid DEFAULT NULL,
  _call_id uuid DEFAULT NULL,
  _request_id uuid DEFAULT NULL,
  _creator_profile_id uuid DEFAULT NULL,
  _live_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _user uuid := auth.uid();
  _balance bigint;
  _amount bigint;
  _existing_id uuid;
  _live RECORD;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF _kind = 'live_ticket' THEN
    IF _live_id IS NULL THEN RAISE EXCEPTION 'live_id_required'; END IF;

    SELECT id, creator_id, creator_profile_id, price_cents, status
      INTO _live FROM public.live_sessions WHERE id = _live_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'live_not_found'; END IF;
    IF _live.creator_id = _user THEN RAISE EXCEPTION 'cannot_buy_own_live'; END IF;
    IF _live.status = 'ended' THEN RAISE EXCEPTION 'live_ended'; END IF;
    IF _live.price_cents IS NULL OR _live.price_cents <= 0 THEN RAISE EXCEPTION 'invalid_price'; END IF;

    _amount := _live.price_cents;

    -- Já comprado?
    SELECT id INTO _existing_id FROM public.live_tickets
     WHERE live_id = _live_id AND buyer_id = _user AND status = 'paid' LIMIT 1;
    IF _existing_id IS NOT NULL THEN
      RETURN jsonb_build_object('status','already','ticket_id', _existing_id);
    END IF;

    -- Saldo
    PERFORM public.ensure_subscriber_wallet(_user);
    SELECT balance_cents INTO _balance FROM public.subscriber_wallets WHERE user_id = _user FOR UPDATE;
    IF COALESCE(_balance,0) < _amount THEN RAISE EXCEPTION 'insufficient_balance'; END IF;

    UPDATE public.subscriber_wallets
       SET balance_cents = balance_cents - _amount,
           updated_at = now()
     WHERE user_id = _user;

    INSERT INTO public.live_tickets (
      live_id, buyer_id, creator_id, creator_profile_id,
      amount_cents, provider, status
    ) VALUES (
      _live_id, _user, _live.creator_id, _live.creator_profile_id,
      _amount, 'wallet', 'paid'
    ) RETURNING id INTO _existing_id;

    RETURN jsonb_build_object('status','paid','ticket_id', _existing_id);
  END IF;

  -- delega para as outras assinaturas existentes
  RETURN public.pay_with_wallet(
    _kind := _kind,
    _publication_id := _publication_id,
    _message_id := _message_id,
    _creator_id := _creator_id,
    _plan := _plan,
    _amount_cents := _amount_cents,
    _message := _message,
    _story_id := _story_id,
    _call_id := _call_id,
    _request_id := _request_id,
    _creator_profile_id := _creator_profile_id
  );
END; $function$;

GRANT EXECUTE ON FUNCTION public.pay_with_wallet(text,uuid,uuid,uuid,text,integer,text,uuid,uuid,uuid,uuid,uuid) TO authenticated;

-- ============================================================
-- REALTIME
-- ============================================================
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_tickets;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_comments;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_likes;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.live_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.live_tickets REPLICA IDENTITY FULL;