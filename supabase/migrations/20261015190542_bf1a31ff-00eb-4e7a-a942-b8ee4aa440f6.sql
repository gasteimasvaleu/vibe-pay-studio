-- =====================================================================
-- 1) Percentual da plataforma passa a vir de platform_settings
-- =====================================================================
CREATE OR REPLACE FUNCTION public.platform_commission_pct(_international boolean DEFAULT false)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN v IS NOT NULL AND v >= 0 AND v <= 90 THEN v
    ELSE CASE WHEN COALESCE(_international, false) THEN 20.00 ELSE 15.00 END
  END
  FROM (
    SELECT (
      SELECT CASE
               WHEN COALESCE(_international, false) THEN commission_pct_international
               ELSE commission_pct_national
             END
      FROM public.platform_settings
      WHERE id = true
      LIMIT 1
    ) AS v
  ) s;
$function$;

GRANT EXECUTE ON FUNCTION public.platform_commission_pct(boolean) TO authenticated, service_role;

-- =====================================================================
-- 2) País do comprador (base da marcação de venda internacional)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.buyer_country_code(_buyer uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT NULLIF(btrim(upper(country)), '') FROM public.profiles WHERE user_id = _buyer LIMIT 1),
    'BR'
  );
$function$;

CREATE OR REPLACE FUNCTION public.buyer_is_international(_buyer uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.buyer_country_code(_buyer) NOT IN ('BR', 'BRA', 'BRAZIL');
$function$;

GRANT EXECUTE ON FUNCTION public.buyer_country_code(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.buyer_is_international(uuid) TO authenticated, service_role;

-- =====================================================================
-- 3) Limites seguros para os percentuais editáveis no painel
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'platform_settings_national_pct_range'
      AND conrelid = 'public.platform_settings'::regclass
  ) THEN
    ALTER TABLE public.platform_settings
      ADD CONSTRAINT platform_settings_national_pct_range
      CHECK (commission_pct_national BETWEEN 0 AND 90);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'platform_settings_international_pct_range'
      AND conrelid = 'public.platform_settings'::regclass
  ) THEN
    ALTER TABLE public.platform_settings
      ADD CONSTRAINT platform_settings_international_pct_range
      CHECK (commission_pct_international BETWEEN 0 AND 90);
  END IF;
END $$;

-- =====================================================================
-- 4) apply_transaction_split passa a resolver o percentual quando omitido
-- =====================================================================
CREATE OR REPLACE FUNCTION public.apply_transaction_split(
  _gross_cents bigint,
  _commission_pct numeric DEFAULT NULL
)
RETURNS TABLE(platform_fee_cents bigint, net_cents bigint, commission_pct_applied numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  _commission_pct := COALESCE(_commission_pct, public.platform_commission_pct(false));
  platform_fee_cents := FLOOR(_gross_cents * _commission_pct / 100.0)::BIGINT;
  net_cents := _gross_cents - platform_fee_cents;
  commission_pct_applied := _commission_pct;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_transaction_split(
  _gross_cents bigint,
  _commission_pct numeric DEFAULT NULL,
  _method payment_method DEFAULT 'manual'::payment_method
)
RETURNS TABLE(platform_fee_cents bigint, gateway_fee_cents bigint, net_cents bigint, commission_pct_applied numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  _commission_pct := COALESCE(_commission_pct, public.platform_commission_pct(false));
  platform_fee_cents := FLOOR(_gross_cents * _commission_pct / 100.0)::BIGINT;
  gateway_fee_cents  := public.calc_gateway_fee_cents(_gross_cents, _method);
  net_cents          := GREATEST(_gross_cents - platform_fee_cents - gateway_fee_cents, 0);
  commission_pct_applied := _commission_pct;
  RETURN NEXT;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.apply_transaction_split(bigint, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_transaction_split(bigint, numeric, payment_method) TO authenticated, service_role;

-- =====================================================================
-- 5) Gatilhos de venda: percentual das configurações + país do comprador
-- =====================================================================
CREATE OR REPLACE FUNCTION public.publication_unlocks_sync_transaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _author UUID;
  _profile UUID;
  _split RECORD;
  _tx_id UUID;
  _method public.payment_method;
  _country text;
  _intl boolean;
  _pct numeric;
BEGIN
  IF NEW.status <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' THEN RETURN NEW; END IF;
  IF NEW.transaction_id IS NOT NULL THEN RETURN NEW; END IF;

  SELECT author_id, creator_profile_id INTO _author, _profile
    FROM public.publications WHERE id = NEW.publication_id;
  IF _author IS NULL THEN RETURN NEW; END IF;
  IF _profile IS NULL THEN _profile := public.default_paid_profile(_author); END IF;
  IF NEW.creator_profile_id IS NULL THEN NEW.creator_profile_id := _profile; END IF;

  _method := CASE
    WHEN NEW.provider IN ('pix','asaas_pix') THEN 'pix'::public.payment_method
    WHEN NEW.provider IN ('credit_card','card','asaas_card') THEN 'credit_card'::public.payment_method
    WHEN NEW.provider = 'wallet' THEN 'wallet'::public.payment_method
    WHEN NEW.provider = 'boleto' THEN 'boleto'::public.payment_method
    ELSE 'manual'::public.payment_method
  END;

  _country := public.buyer_country_code(NEW.buyer_id);
  _intl := _country NOT IN ('BR', 'BRA', 'BRAZIL');
  _pct := public.platform_commission_pct(_intl);

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.amount_cents::BIGINT, _pct, _method);

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id, creator_profile_id,
    amount_cents_gross, platform_fee_cents, gateway_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref, reference_table, reference_id,
    country_code, is_international
  ) VALUES (
    'publication_unlock','paid', NEW.buyer_id, _author, _profile,
    NEW.amount_cents, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, COALESCE(NEW.provider,'manual'), NEW.provider_ref, 'publication_unlocks', NEW.id,
    _country, _intl
  ) RETURNING id INTO _tx_id;

  NEW.transaction_id := _tx_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.story_unlocks_sync_transaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _split RECORD; _tx_id UUID; _method public.payment_method; _profile UUID;
  _country text; _intl boolean; _pct numeric;
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

  _country := public.buyer_country_code(NEW.buyer_id);
  _intl := _country NOT IN ('BR', 'BRA', 'BRAZIL');
  _pct := public.platform_commission_pct(_intl);

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.amount_cents::BIGINT, _pct, _method);

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id, creator_profile_id,
    amount_cents_gross, platform_fee_cents, gateway_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref, reference_table, reference_id,
    country_code, is_international
  ) VALUES (
    'story_unlock','paid', NEW.buyer_id, NEW.creator_id, _profile,
    NEW.amount_cents, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, COALESCE(NEW.provider,'manual'), NEW.provider_ref, 'story_unlocks', NEW.id,
    _country, _intl
  ) RETURNING id INTO _tx_id;

  NEW.transaction_id := _tx_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.chat_message_unlocks_sync_transaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _split RECORD; _tx_id UUID; _method public.payment_method; _profile UUID;
  _country text; _intl boolean; _pct numeric;
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

  _country := public.buyer_country_code(NEW.buyer_id);
  _intl := _country NOT IN ('BR', 'BRA', 'BRAZIL');
  _pct := public.platform_commission_pct(_intl);

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.amount_cents::BIGINT, _pct, _method);

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id, creator_profile_id,
    amount_cents_gross, platform_fee_cents, gateway_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref, reference_table, reference_id,
    country_code, is_international
  ) VALUES (
    'chat_unlock','paid', NEW.buyer_id, NEW.creator_id, _profile,
    NEW.amount_cents, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, COALESCE(NEW.provider,'manual'), NEW.provider_ref, 'chat_message_unlocks', NEW.id,
    _country, _intl
  ) RETURNING id INTO _tx_id;

  NEW.transaction_id := _tx_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.chat_media_requests_sync_transaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _split RECORD;
  _tx_id UUID;
  _method public.payment_method;
  _profile UUID;
  _country text;
  _intl boolean;
  _pct numeric;
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

  _country := public.buyer_country_code(NEW.requester_id);
  _intl := _country NOT IN ('BR', 'BRA', 'BRAZIL');
  _pct := public.platform_commission_pct(_intl);

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.price_cents::BIGINT, _pct, _method);

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id, creator_profile_id,
    amount_cents_gross, platform_fee_cents, gateway_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref, reference_table, reference_id,
    country_code, is_international
  ) VALUES (
    'chat_unlock','paid', NEW.requester_id, NEW.creator_id, _profile,
    NEW.price_cents, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, COALESCE(NEW.provider,'manual'), NEW.provider_ref, 'chat_media_requests', NEW.id,
    _country, _intl
  ) RETURNING id INTO _tx_id;

  NEW.transaction_id := _tx_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.live_tickets_sync_transaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _split RECORD; _tx_id UUID; _method public.payment_method; _profile UUID;
  _country text; _intl boolean; _pct numeric;
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

  _country := public.buyer_country_code(NEW.buyer_id);
  _intl := _country NOT IN ('BR', 'BRA', 'BRAZIL');
  _pct := public.platform_commission_pct(_intl);

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.amount_cents::BIGINT, _pct, _method);

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id, creator_profile_id,
    amount_cents_gross, platform_fee_cents, gateway_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref, reference_table, reference_id,
    country_code, is_international
  ) VALUES (
    'live_ticket','paid', NEW.buyer_id, NEW.creator_id, _profile,
    NEW.amount_cents, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, COALESCE(NEW.provider,'manual'), NEW.provider_ref, 'live_tickets', NEW.id,
    _country, _intl
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
  _split RECORD; _tx_id UUID; _method public.payment_method; _profile UUID;
  _country text; _intl boolean; _pct numeric;
BEGIN
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN RETURN NEW; END IF;
  IF NEW.price_cents_paid <= 0 THEN RETURN NEW; END IF;

  _profile := COALESCE(NEW.creator_profile_id, public.default_paid_profile(NEW.creator_id));
  IF NEW.creator_profile_id IS NULL THEN NEW.creator_profile_id := _profile; END IF;

  _method := CASE
    WHEN NEW.provider IN ('pix','asaas_pix') THEN 'pix'::public.payment_method
    WHEN NEW.provider IN ('credit_card','card','asaas_card') THEN 'credit_card'::public.payment_method
    WHEN NEW.provider = 'wallet' THEN 'wallet'::public.payment_method
    WHEN NEW.provider = 'boleto' THEN 'boleto'::public.payment_method
    ELSE 'manual'::public.payment_method
  END;

  _country := public.buyer_country_code(NEW.subscriber_id);
  _intl := _country NOT IN ('BR', 'BRA', 'BRAZIL');
  _pct := public.platform_commission_pct(_intl);

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.price_cents_paid::BIGINT, _pct, _method);

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id, creator_profile_id,
    amount_cents_gross, platform_fee_cents, gateway_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref, reference_table, reference_id, metadata,
    country_code, is_international
  ) VALUES (
    'subscription','paid', NEW.subscriber_id, NEW.creator_id, _profile,
    NEW.price_cents_paid, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, NEW.provider, NEW.provider_ref, 'subscriptions', NEW.id,
    jsonb_build_object('plan', NEW.plan),
    _country, _intl
  ) RETURNING id INTO _tx_id;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tips_sync_transaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _split RECORD; _tx_id UUID; _method public.payment_method; _profile UUID;
  _country text; _intl boolean; _pct numeric;
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

  _country := public.buyer_country_code(NEW.sender_id);
  _intl := _country NOT IN ('BR', 'BRA', 'BRAZIL');
  _pct := public.platform_commission_pct(_intl);

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.amount_cents::BIGINT, _pct, _method);

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id, creator_profile_id,
    amount_cents_gross, platform_fee_cents, gateway_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref, reference_table, reference_id, metadata,
    country_code, is_international
  ) VALUES (
    'tip','paid', NEW.sender_id, NEW.creator_id, _profile,
    NEW.amount_cents, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, NEW.provider, NEW.provider_ref, 'tips', NEW.id,
    CASE WHEN NEW.message IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('message', NEW.message) END,
    _country, _intl
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
  _split RECORD; _tx_id UUID; _method public.payment_method; _profile UUID;
  _country text; _intl boolean; _pct numeric;
BEGIN
  IF NEW.payment_status <> 'paid' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.payment_status = 'paid' THEN RETURN NEW; END IF;
  IF NEW.transaction_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.price_cents <= 0 THEN RETURN NEW; END IF;

  _profile := COALESCE(NEW.creator_profile_id, public.default_paid_profile(NEW.creator_id));
  IF NEW.creator_profile_id IS NULL THEN NEW.creator_profile_id := _profile; END IF;

  _method := CASE
    WHEN NEW.provider IN ('pix','asaas_pix') THEN 'pix'::public.payment_method
    WHEN NEW.provider IN ('credit_card','card','asaas_card') THEN 'credit_card'::public.payment_method
    WHEN NEW.provider = 'wallet' THEN 'wallet'::public.payment_method
    WHEN NEW.provider = 'boleto' THEN 'boleto'::public.payment_method
    ELSE 'manual'::public.payment_method
  END;

  _country := public.buyer_country_code(NEW.requester_id);
  _intl := _country NOT IN ('BR', 'BRA', 'BRAZIL');
  _pct := public.platform_commission_pct(_intl);

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.price_cents::BIGINT, _pct, _method);

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id, creator_profile_id,
    amount_cents_gross, platform_fee_cents, gateway_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref, reference_table, reference_id, metadata,
    country_code, is_international
  ) VALUES (
    'video_call','paid', NEW.requester_id, NEW.creator_id, _profile,
    NEW.price_cents, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, COALESCE(NEW.provider,'manual'), NEW.provider_ref, 'video_calls', NEW.id,
    jsonb_build_object('duration_minutes', NEW.duration_minutes, 'scheduled_at', NEW.scheduled_at),
    _country, _intl
  ) RETURNING id INTO _tx_id;

  NEW.transaction_id := _tx_id;
  RETURN NEW;
END;
$function$;