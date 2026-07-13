
-- =========================================================================
-- Enums
-- =========================================================================
CREATE TYPE public.transaction_kind AS ENUM (
  'subscription',
  'publication_unlock',
  'chat_unlock',
  'tip',
  'video_call',
  'live_ticket',
  'challenge_contribution',
  'wallet_topup',
  'wallet_bonus',
  'referral_credit',
  'affiliate_credit',
  'withdrawal',
  'refund'
);

CREATE TYPE public.transaction_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'refunded',
  'cancelled'
);

CREATE TYPE public.payment_method AS ENUM (
  'pix',
  'credit_card',
  'boleto',
  'wallet',
  'manual'
);

CREATE TYPE public.withdrawal_status AS ENUM (
  'requested',
  'in_review',
  'approved',
  'paid',
  'rejected',
  'failed'
);

-- =========================================================================
-- creator_wallets
-- =========================================================================
CREATE TABLE public.creator_wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  released_cents BIGINT NOT NULL DEFAULT 0,
  pending_national_cents BIGINT NOT NULL DEFAULT 0,
  pending_international_cents BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT creator_wallets_non_negative CHECK (
    released_cents >= 0
    AND pending_national_cents >= 0
    AND pending_international_cents >= 0
  )
);

GRANT SELECT ON public.creator_wallets TO authenticated;
GRANT ALL ON public.creator_wallets TO service_role;
ALTER TABLE public.creator_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator sees own wallet"
  ON public.creator_wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin reads all wallets"
  ON public.creator_wallets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- subscriber_wallets
-- =========================================================================
CREATE TABLE public.subscriber_wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_cents BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscriber_wallets_non_negative CHECK (balance_cents >= 0)
);

GRANT SELECT ON public.subscriber_wallets TO authenticated;
GRANT ALL ON public.subscriber_wallets TO service_role;
ALTER TABLE public.subscriber_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user sees own subscriber wallet"
  ON public.subscriber_wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin reads all subscriber wallets"
  ON public.subscriber_wallets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- transactions
-- =========================================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.transaction_kind NOT NULL,
  status public.transaction_status NOT NULL DEFAULT 'pending',

  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  amount_cents_gross BIGINT NOT NULL,
  platform_fee_cents BIGINT NOT NULL,
  net_cents BIGINT NOT NULL,
  commission_pct_applied NUMERIC(5,2) NOT NULL,

  payment_method public.payment_method NOT NULL DEFAULT 'manual',
  country_code TEXT NOT NULL DEFAULT 'BR',
  is_international BOOLEAN NOT NULL DEFAULT false,

  provider TEXT NOT NULL DEFAULT 'manual',
  provider_ref TEXT,

  -- Referência opcional ao objeto (post, assinatura, live, etc.)
  reference_table TEXT,
  reference_id UUID,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Janela de garantia (compras de conteúdo digital: 60 dias)
  access_until TIMESTAMPTZ,
  -- Quando o valor é liberado para saque (Pix imediato, cartão D+15)
  released_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT transactions_amounts_non_negative CHECK (
    amount_cents_gross >= 0
    AND platform_fee_cents >= 0
    AND net_cents >= 0
  ),
  CONSTRAINT transactions_split_consistent CHECK (
    platform_fee_cents + net_cents = amount_cents_gross
  ),
  CONSTRAINT transactions_no_self_purchase CHECK (
    buyer_id IS NULL OR creator_id IS NULL OR buyer_id <> creator_id
  )
);

CREATE INDEX transactions_creator_created_idx
  ON public.transactions (creator_id, created_at DESC);
CREATE INDEX transactions_buyer_created_idx
  ON public.transactions (buyer_id, created_at DESC);
CREATE INDEX transactions_status_kind_idx
  ON public.transactions (status, kind);
CREATE UNIQUE INDEX transactions_provider_ref_uidx
  ON public.transactions (provider, provider_ref)
  WHERE provider_ref IS NOT NULL;

GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer sees own transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "creator sees own transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "admin reads all transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- withdrawals
-- =========================================================================
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL,
  fee_cents BIGINT NOT NULL DEFAULT 0,
  net_cents BIGINT NOT NULL,
  pix_key TEXT NOT NULL,
  pix_key_type TEXT,
  status public.withdrawal_status NOT NULL DEFAULT 'requested',
  is_first_withdrawal BOOLEAN NOT NULL DEFAULT false,
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_ref TEXT,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT withdrawals_amount_min CHECK (amount_cents >= 3000), -- R$ 30,00
  CONSTRAINT withdrawals_amounts_consistent CHECK (net_cents = amount_cents - fee_cents),
  CONSTRAINT withdrawals_non_negative CHECK (
    amount_cents >= 0 AND fee_cents >= 0 AND net_cents >= 0
  )
);

CREATE INDEX withdrawals_creator_idx
  ON public.withdrawals (creator_id, requested_at DESC);

GRANT SELECT, INSERT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator sees own withdrawals"
  ON public.withdrawals FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "creator requests own withdrawal"
  ON public.withdrawals FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
    AND status = 'requested'
    AND provider = 'manual'
  );

CREATE POLICY "admin reads all withdrawals"
  ON public.withdrawals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- payment_intents (idempotência de webhook)
-- =========================================================================
CREATE TABLE public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_intents_unique_event UNIQUE (provider, event_id)
);

GRANT ALL ON public.payment_intents TO service_role;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin reads payment intents"
  ON public.payment_intents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- Função de split imutável (20% plataforma / 80% criador)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.apply_transaction_split(
  _gross_cents BIGINT,
  _commission_pct NUMERIC DEFAULT 20.00
)
RETURNS TABLE (
  platform_fee_cents BIGINT,
  net_cents BIGINT,
  commission_pct_applied NUMERIC
)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  platform_fee_cents := FLOOR(_gross_cents * _commission_pct / 100.0)::BIGINT;
  net_cents := _gross_cents - platform_fee_cents;
  commission_pct_applied := _commission_pct;
  RETURN NEXT;
END;
$$;

-- =========================================================================
-- Trigger: garantir carteira e creditar saldo quando transação vira 'paid'
-- =========================================================================
CREATE OR REPLACE FUNCTION public.ensure_creator_wallet(_user_id UUID)
RETURNS VOID
LANGUAGE sql
SET search_path = public
AS $$
  INSERT INTO public.creator_wallets (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public.ensure_subscriber_wallet(_user_id UUID)
RETURNS VOID
LANGUAGE sql
SET search_path = public
AS $$
  INSERT INTO public.subscriber_wallets (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public.transactions_apply_wallet_effects()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  became_paid BOOLEAN;
  became_refunded BOOLEAN;
BEGIN
  became_paid := (TG_OP = 'INSERT' AND NEW.status = 'paid')
    OR (TG_OP = 'UPDATE' AND OLD.status <> 'paid' AND NEW.status = 'paid');

  became_refunded := (TG_OP = 'UPDATE' AND OLD.status = 'paid' AND NEW.status IN ('refunded','cancelled','failed'));

  IF became_paid AND NEW.creator_id IS NOT NULL AND NEW.net_cents > 0
     AND NEW.kind NOT IN ('withdrawal','refund','wallet_topup','wallet_bonus') THEN

    PERFORM public.ensure_creator_wallet(NEW.creator_id);

    -- Define released_at conforme meio de pagamento se ainda não estiver marcado
    IF NEW.released_at IS NULL THEN
      IF NEW.is_international THEN
        NEW.released_at := now() + INTERVAL '15 days';
      ELSIF NEW.payment_method = 'credit_card' THEN
        NEW.released_at := now() + INTERVAL '15 days';
      ELSIF NEW.payment_method = 'boleto' THEN
        NEW.released_at := now() + INTERVAL '2 days';
      ELSE
        -- pix, wallet, manual: imediato
        NEW.released_at := now();
      END IF;
    END IF;

    -- Credita saldo: liberado se released_at <= now(), pendente caso contrário
    IF NEW.released_at <= now() THEN
      UPDATE public.creator_wallets
        SET released_cents = released_cents + NEW.net_cents,
            updated_at = now()
        WHERE user_id = NEW.creator_id;
    ELSIF NEW.is_international THEN
      UPDATE public.creator_wallets
        SET pending_international_cents = pending_international_cents + NEW.net_cents,
            updated_at = now()
        WHERE user_id = NEW.creator_id;
    ELSE
      UPDATE public.creator_wallets
        SET pending_national_cents = pending_national_cents + NEW.net_cents,
            updated_at = now()
        WHERE user_id = NEW.creator_id;
    END IF;

    -- Garantia de acesso de 60 dias para conteúdo digital
    IF NEW.access_until IS NULL AND NEW.kind IN ('publication_unlock','chat_unlock') THEN
      NEW.access_until := now() + INTERVAL '60 days';
    END IF;
  END IF;

  -- Recarga de wallet do assinante credita a carteira imediatamente
  IF became_paid AND NEW.kind IN ('wallet_topup','wallet_bonus')
     AND NEW.buyer_id IS NOT NULL AND NEW.amount_cents_gross > 0 THEN
    PERFORM public.ensure_subscriber_wallet(NEW.buyer_id);
    UPDATE public.subscriber_wallets
      SET balance_cents = balance_cents + NEW.amount_cents_gross,
          updated_at = now()
      WHERE user_id = NEW.buyer_id;
  END IF;

  -- Estorno: debita o valor líquido do saldo liberado (não deixa negativo)
  IF became_refunded AND NEW.creator_id IS NOT NULL AND NEW.net_cents > 0
     AND NEW.kind NOT IN ('withdrawal','refund','wallet_topup','wallet_bonus') THEN
    UPDATE public.creator_wallets
      SET released_cents = GREATEST(released_cents - NEW.net_cents, 0),
          updated_at = now()
      WHERE user_id = NEW.creator_id;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_transactions_wallet_effects
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.transactions_apply_wallet_effects();

-- =========================================================================
-- updated_at triggers para carteiras e saques (reusa set_updated_at existente)
-- =========================================================================
CREATE TRIGGER trg_withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
