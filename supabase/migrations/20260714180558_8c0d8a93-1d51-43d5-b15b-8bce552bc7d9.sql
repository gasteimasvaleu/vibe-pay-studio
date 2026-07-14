
-- 1) New column to store gateway fee per transaction
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS gateway_fee_cents BIGINT NOT NULL DEFAULT 0;

-- 2) Gateway fee calculator (values sem promocional)
CREATE OR REPLACE FUNCTION public.calc_gateway_fee_cents(
  _gross_cents BIGINT,
  _method public.payment_method
) RETURNS BIGINT
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF _gross_cents IS NULL OR _gross_cents <= 0 THEN
    RETURN 0;
  END IF;

  RETURN CASE _method
    WHEN 'pix'         THEN 199::BIGINT
    WHEN 'boleto'      THEN 199::BIGINT
    -- Cartão de crédito à vista: 2,99% + R$ 0,49
    WHEN 'credit_card' THEN CEIL(_gross_cents * 0.0299)::BIGINT + 49
    ELSE 0::BIGINT
  END;
END;
$$;

-- 3) Split now also subtracts the gateway fee (charged to the creator)
CREATE OR REPLACE FUNCTION public.apply_transaction_split(
  _gross_cents BIGINT,
  _commission_pct NUMERIC DEFAULT 15.00,
  _method public.payment_method DEFAULT 'manual'::public.payment_method
)
RETURNS TABLE(
  platform_fee_cents BIGINT,
  gateway_fee_cents BIGINT,
  net_cents BIGINT,
  commission_pct_applied NUMERIC
)
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  platform_fee_cents := FLOOR(_gross_cents * _commission_pct / 100.0)::BIGINT;
  gateway_fee_cents  := public.calc_gateway_fee_cents(_gross_cents, _method);
  net_cents          := GREATEST(_gross_cents - platform_fee_cents - gateway_fee_cents, 0);
  commission_pct_applied := _commission_pct;
  RETURN NEXT;
END;
$$;

-- 4) Update sync triggers to pass method and persist gateway_fee_cents
CREATE OR REPLACE FUNCTION public.publication_unlocks_sync_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _author UUID;
  _split RECORD;
  _tx_id UUID;
  _method public.payment_method;
BEGIN
  IF NEW.status <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' THEN RETURN NEW; END IF;
  IF NEW.transaction_id IS NOT NULL THEN RETURN NEW; END IF;

  SELECT author_id INTO _author FROM public.publications WHERE id = NEW.publication_id;
  IF _author IS NULL THEN RETURN NEW; END IF;

  _method := CASE
    WHEN NEW.provider IN ('pix','asaas_pix') THEN 'pix'::public.payment_method
    WHEN NEW.provider IN ('credit_card','card','asaas_card') THEN 'credit_card'::public.payment_method
    WHEN NEW.provider = 'wallet' THEN 'wallet'::public.payment_method
    WHEN NEW.provider = 'boleto' THEN 'boleto'::public.payment_method
    ELSE 'manual'::public.payment_method
  END;

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.amount_cents::BIGINT, 15.00, _method);

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id,
    amount_cents_gross, platform_fee_cents, gateway_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref,
    reference_table, reference_id
  ) VALUES (
    'publication_unlock', 'paid', NEW.buyer_id, _author,
    NEW.amount_cents, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, COALESCE(NEW.provider, 'manual'), NEW.provider_ref,
    'publication_unlocks', NEW.id
  ) RETURNING id INTO _tx_id;

  NEW.transaction_id := _tx_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tips_sync_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _split RECORD;
  _tx_id UUID;
  _method public.payment_method;
BEGIN
  IF NEW.status <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' THEN RETURN NEW; END IF;
  IF NEW.transaction_id IS NOT NULL THEN RETURN NEW; END IF;

  _method := CASE
    WHEN NEW.provider IN ('pix','asaas_pix') THEN 'pix'::public.payment_method
    WHEN NEW.provider IN ('credit_card','card','asaas_card') THEN 'credit_card'::public.payment_method
    WHEN NEW.provider = 'wallet' THEN 'wallet'::public.payment_method
    WHEN NEW.provider = 'boleto' THEN 'boleto'::public.payment_method
    ELSE 'manual'::public.payment_method
  END;

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.amount_cents::BIGINT, 15.00, _method);

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id,
    amount_cents_gross, platform_fee_cents, gateway_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref,
    reference_table, reference_id, metadata
  ) VALUES (
    'tip', 'paid', NEW.sender_id, NEW.creator_id,
    NEW.amount_cents, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, NEW.provider, NEW.provider_ref,
    'tips', NEW.id,
    CASE WHEN NEW.message IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('message', NEW.message) END
  ) RETURNING id INTO _tx_id;

  NEW.transaction_id := _tx_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.subscriptions_sync_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _split RECORD;
  _tx_id UUID;
  _method public.payment_method;
BEGIN
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN RETURN NEW; END IF;
  IF NEW.price_cents_paid <= 0 THEN RETURN NEW; END IF;

  _method := CASE
    WHEN NEW.provider IN ('pix','asaas_pix') THEN 'pix'::public.payment_method
    WHEN NEW.provider IN ('credit_card','card','asaas_card') THEN 'credit_card'::public.payment_method
    WHEN NEW.provider = 'wallet' THEN 'wallet'::public.payment_method
    WHEN NEW.provider = 'boleto' THEN 'boleto'::public.payment_method
    ELSE 'manual'::public.payment_method
  END;

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.price_cents_paid::BIGINT, 15.00, _method);

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id,
    amount_cents_gross, platform_fee_cents, gateway_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref,
    reference_table, reference_id,
    metadata
  ) VALUES (
    'subscription', 'paid', NEW.subscriber_id, NEW.creator_id,
    NEW.price_cents_paid, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, NEW.provider, NEW.provider_ref,
    'subscriptions', NEW.id,
    jsonb_build_object('plan', NEW.plan)
  ) RETURNING id INTO _tx_id;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.chat_message_unlocks_sync_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _split RECORD;
  _tx_id UUID;
  _method public.payment_method;
BEGIN
  IF NEW.status <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' THEN RETURN NEW; END IF;
  IF NEW.transaction_id IS NOT NULL THEN RETURN NEW; END IF;

  _method := CASE
    WHEN NEW.provider IN ('pix','asaas_pix') THEN 'pix'::public.payment_method
    WHEN NEW.provider IN ('credit_card','card','asaas_card') THEN 'credit_card'::public.payment_method
    WHEN NEW.provider = 'wallet' THEN 'wallet'::public.payment_method
    WHEN NEW.provider = 'boleto' THEN 'boleto'::public.payment_method
    ELSE 'manual'::public.payment_method
  END;

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.amount_cents::BIGINT, 15.00, _method);

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id,
    amount_cents_gross, platform_fee_cents, gateway_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref,
    reference_table, reference_id
  ) VALUES (
    'chat_unlock','paid', NEW.buyer_id, NEW.creator_id,
    NEW.amount_cents, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, COALESCE(NEW.provider,'manual'), NEW.provider_ref,
    'chat_message_unlocks', NEW.id
  ) RETURNING id INTO _tx_id;

  NEW.transaction_id := _tx_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.video_calls_sync_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _split RECORD;
  _tx_id UUID;
  _method public.payment_method;
BEGIN
  IF NEW.payment_status <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.payment_status = 'paid' THEN RETURN NEW; END IF;
  IF NEW.transaction_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.price_cents <= 0 THEN RETURN NEW; END IF;

  _method := CASE
    WHEN NEW.provider IN ('pix','asaas_pix') THEN 'pix'::public.payment_method
    WHEN NEW.provider IN ('credit_card','card','asaas_card') THEN 'credit_card'::public.payment_method
    WHEN NEW.provider = 'wallet' THEN 'wallet'::public.payment_method
    WHEN NEW.provider = 'boleto' THEN 'boleto'::public.payment_method
    ELSE 'manual'::public.payment_method
  END;

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.price_cents::BIGINT, 15.00, _method);

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id,
    amount_cents_gross, platform_fee_cents, gateway_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref,
    reference_table, reference_id,
    metadata
  ) VALUES (
    'video_call','paid', NEW.requester_id, NEW.creator_id,
    NEW.price_cents, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, COALESCE(NEW.provider,'manual'), NEW.provider_ref,
    'video_calls', NEW.id,
    jsonb_build_object('duration_minutes', NEW.duration_minutes, 'scheduled_at', NEW.scheduled_at)
  ) RETURNING id INTO _tx_id;

  NEW.transaction_id := _tx_id;
  RETURN NEW;
END;
$function$;
