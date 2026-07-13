
-- =========================================================================
-- Enums
-- =========================================================================
CREATE TYPE public.subscription_plan AS ENUM ('monthly','quarterly','semiannual');
CREATE TYPE public.subscription_status AS ENUM ('active','cancelled','expired','pending');

-- =========================================================================
-- subscriptions
-- =========================================================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.subscription_plan NOT NULL DEFAULT 'monthly',
  price_cents_paid BIGINT NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  status public.subscription_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_no_self CHECK (subscriber_id <> creator_id),
  CONSTRAINT subscriptions_price_non_negative CHECK (price_cents_paid >= 0)
);

CREATE UNIQUE INDEX subscriptions_active_uidx
  ON public.subscriptions (subscriber_id, creator_id)
  WHERE status = 'active';

CREATE INDEX subscriptions_creator_idx
  ON public.subscriptions (creator_id, status);

GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriber sees own subs"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = subscriber_id);

CREATE POLICY "creator sees subs to self"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "subscriber creates own sub"
  ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = subscriber_id);

CREATE POLICY "subscriber updates own sub"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = subscriber_id)
  WITH CHECK (auth.uid() = subscriber_id);

CREATE POLICY "admin manages subs"
  ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- tips
-- =========================================================================
CREATE TABLE public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  publication_id UUID REFERENCES public.publications(id) ON DELETE SET NULL,
  amount_cents BIGINT NOT NULL,
  message TEXT,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_ref TEXT,
  status public.transaction_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tips_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT tips_no_self CHECK (sender_id <> creator_id)
);

CREATE INDEX tips_creator_idx ON public.tips (creator_id, created_at DESC);
CREATE INDEX tips_sender_idx ON public.tips (sender_id, created_at DESC);

GRANT SELECT, INSERT ON public.tips TO authenticated;
GRANT ALL ON public.tips TO service_role;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sender sees own tips"
  ON public.tips FOR SELECT TO authenticated
  USING (auth.uid() = sender_id);

CREATE POLICY "creator sees received tips"
  ON public.tips FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "sender creates own tip"
  ON public.tips FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "admin reads all tips"
  ON public.tips FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- Anti self-purchase em publication_unlocks (constraint + integração transactions)
-- =========================================================================

-- publication_unlocks já existe; adicionamos coluna transaction_id + trigger
ALTER TABLE public.publication_unlocks
  ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

-- Bloqueia comprador == autor da publicação
CREATE OR REPLACE FUNCTION public.publication_unlocks_prevent_self_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _author UUID;
BEGIN
  SELECT author_id INTO _author FROM public.publications WHERE id = NEW.publication_id;
  IF _author IS NOT NULL AND _author = NEW.buyer_id THEN
    RAISE EXCEPTION 'buyer cannot unlock own publication';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_publication_unlocks_no_self ON public.publication_unlocks;
CREATE TRIGGER trg_publication_unlocks_no_self
  BEFORE INSERT ON public.publication_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.publication_unlocks_prevent_self_purchase();

-- Cria transação com split quando unlock vira 'paid'
CREATE OR REPLACE FUNCTION public.publication_unlocks_sync_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _author UUID;
  _split RECORD;
  _tx_id UUID;
  _method public.payment_method;
BEGIN
  IF NEW.status <> 'paid' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' THEN
    RETURN NEW;
  END IF;

  IF NEW.transaction_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT author_id INTO _author FROM public.publications WHERE id = NEW.publication_id;
  IF _author IS NULL THEN
    RETURN NEW;
  END IF;

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
    'publication_unlock', 'paid', NEW.buyer_id, _author,
    NEW.amount_cents, _split.platform_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, COALESCE(NEW.provider, 'manual'), NEW.provider_ref,
    'publication_unlocks', NEW.id
  ) RETURNING id INTO _tx_id;

  NEW.transaction_id := _tx_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_publication_unlocks_sync_tx ON public.publication_unlocks;
CREATE TRIGGER trg_publication_unlocks_sync_tx
  BEFORE INSERT OR UPDATE ON public.publication_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.publication_unlocks_sync_transaction();

-- =========================================================================
-- Trigger: mimo pago cria transação
-- =========================================================================
CREATE OR REPLACE FUNCTION public.tips_sync_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _split RECORD;
  _tx_id UUID;
  _method public.payment_method;
BEGIN
  IF NEW.status <> 'paid' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' THEN
    RETURN NEW;
  END IF;

  IF NEW.transaction_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.amount_cents::BIGINT);

  _method := CASE
    WHEN NEW.provider IN ('pix','asaas_pix') THEN 'pix'::public.payment_method
    WHEN NEW.provider = 'wallet' THEN 'wallet'::public.payment_method
    ELSE 'manual'::public.payment_method
  END;

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id,
    amount_cents_gross, platform_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref,
    reference_table, reference_id, metadata
  ) VALUES (
    'tip', 'paid', NEW.sender_id, NEW.creator_id,
    NEW.amount_cents, _split.platform_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, NEW.provider, NEW.provider_ref,
    'tips', NEW.id,
    CASE WHEN NEW.message IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('message', NEW.message) END
  ) RETURNING id INTO _tx_id;

  NEW.transaction_id := _tx_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tips_sync_tx ON public.tips;
CREATE TRIGGER trg_tips_sync_tx
  BEFORE INSERT OR UPDATE ON public.tips
  FOR EACH ROW EXECUTE FUNCTION public.tips_sync_transaction();

-- =========================================================================
-- Trigger: assinatura paga cria transação
-- =========================================================================
CREATE OR REPLACE FUNCTION public.subscriptions_sync_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _split RECORD;
  _tx_id UUID;
  _method public.payment_method;
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  IF NEW.price_cents_paid <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.price_cents_paid::BIGINT);

  _method := CASE
    WHEN NEW.provider IN ('pix','asaas_pix') THEN 'pix'::public.payment_method
    WHEN NEW.provider IN ('credit_card','card','asaas_card') THEN 'credit_card'::public.payment_method
    WHEN NEW.provider = 'wallet' THEN 'wallet'::public.payment_method
    ELSE 'manual'::public.payment_method
  END;

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id,
    amount_cents_gross, platform_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref,
    reference_table, reference_id,
    metadata
  ) VALUES (
    'subscription', 'paid', NEW.subscriber_id, NEW.creator_id,
    NEW.price_cents_paid, _split.platform_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, NEW.provider, NEW.provider_ref,
    'subscriptions', NEW.id,
    jsonb_build_object('plan', NEW.plan)
  ) RETURNING id INTO _tx_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_sync_tx ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_sync_tx
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.subscriptions_sync_transaction();
