
-- Helper: pega o perfil pago do criador quando o chamador não passou um explícito.
CREATE OR REPLACE FUNCTION public.default_paid_profile(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.creator_profiles WHERE user_id = _user_id AND kind = 'paid' LIMIT 1;
$$;

-- === publication_unlocks_sync_transaction ===
CREATE OR REPLACE FUNCTION public.publication_unlocks_sync_transaction()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  _author UUID;
  _profile UUID;
  _split RECORD;
  _tx_id UUID;
  _method public.payment_method;
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

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.amount_cents::BIGINT, 15.00, _method);

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id, creator_profile_id,
    amount_cents_gross, platform_fee_cents, gateway_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref, reference_table, reference_id
  ) VALUES (
    'publication_unlock','paid', NEW.buyer_id, _author, _profile,
    NEW.amount_cents, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, COALESCE(NEW.provider,'manual'), NEW.provider_ref, 'publication_unlocks', NEW.id
  ) RETURNING id INTO _tx_id;

  NEW.transaction_id := _tx_id;
  RETURN NEW;
END; $$;

-- === tips_sync_transaction ===
CREATE OR REPLACE FUNCTION public.tips_sync_transaction()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
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
    payment_method, provider, provider_ref, reference_table, reference_id, metadata
  ) VALUES (
    'tip','paid', NEW.sender_id, NEW.creator_id, _profile,
    NEW.amount_cents, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, NEW.provider, NEW.provider_ref, 'tips', NEW.id,
    CASE WHEN NEW.message IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('message', NEW.message) END
  ) RETURNING id INTO _tx_id;

  NEW.transaction_id := _tx_id;
  RETURN NEW;
END; $$;

-- === subscriptions_sync_transaction ===
CREATE OR REPLACE FUNCTION public.subscriptions_sync_transaction()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  _split RECORD; _tx_id UUID; _method public.payment_method; _profile UUID;
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

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.price_cents_paid::BIGINT, 15.00, _method);

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id, creator_profile_id,
    amount_cents_gross, platform_fee_cents, gateway_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref, reference_table, reference_id, metadata
  ) VALUES (
    'subscription','paid', NEW.subscriber_id, NEW.creator_id, _profile,
    NEW.price_cents_paid, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, NEW.provider, NEW.provider_ref, 'subscriptions', NEW.id,
    jsonb_build_object('plan', NEW.plan)
  ) RETURNING id INTO _tx_id;

  RETURN NEW;
END; $$;

-- === chat_message_unlocks_sync_transaction ===
CREATE OR REPLACE FUNCTION public.chat_message_unlocks_sync_transaction()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
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
    'chat_unlock','paid', NEW.buyer_id, NEW.creator_id, _profile,
    NEW.amount_cents, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, COALESCE(NEW.provider,'manual'), NEW.provider_ref, 'chat_message_unlocks', NEW.id
  ) RETURNING id INTO _tx_id;

  NEW.transaction_id := _tx_id;
  RETURN NEW;
END; $$;

-- === video_calls_sync_transaction ===
CREATE OR REPLACE FUNCTION public.video_calls_sync_transaction()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  _split RECORD; _tx_id UUID; _method public.payment_method; _profile UUID;
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

  SELECT * INTO _split FROM public.apply_transaction_split(NEW.price_cents::BIGINT, 15.00, _method);

  INSERT INTO public.transactions (
    kind, status, buyer_id, creator_id, creator_profile_id,
    amount_cents_gross, platform_fee_cents, gateway_fee_cents, net_cents, commission_pct_applied,
    payment_method, provider, provider_ref, reference_table, reference_id, metadata
  ) VALUES (
    'video_call','paid', NEW.requester_id, NEW.creator_id, _profile,
    NEW.price_cents, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, COALESCE(NEW.provider,'manual'), NEW.provider_ref, 'video_calls', NEW.id,
    jsonb_build_object('duration_minutes', NEW.duration_minutes, 'scheduled_at', NEW.scheduled_at)
  ) RETURNING id INTO _tx_id;

  NEW.transaction_id := _tx_id;
  RETURN NEW;
END; $$;

-- === bump_streak_on_publication ===
CREATE OR REPLACE FUNCTION public.bump_streak_on_publication()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _profile UUID;
BEGIN
  _profile := COALESCE(NEW.creator_profile_id, public.default_paid_profile(NEW.author_id));
  INSERT INTO public.creator_streak_days (creator_id, creator_profile_id, day, publications_count)
  VALUES (NEW.author_id, _profile, (COALESCE(NEW.published_at, NEW.created_at, now()))::date, 1)
  ON CONFLICT (creator_id, day) DO UPDATE
    SET publications_count = public.creator_streak_days.publications_count + 1,
        creator_profile_id = COALESCE(public.creator_streak_days.creator_profile_id, EXCLUDED.creator_profile_id),
        updated_at = now();
  RETURN NEW;
END; $$;

-- === bump_streak_on_transaction ===
CREATE OR REPLACE FUNCTION public.bump_streak_on_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _profile UUID;
BEGIN
  IF NEW.status = 'paid'
     AND NEW.creator_id IS NOT NULL
     AND NEW.net_cents > 0
     AND NEW.kind NOT IN ('withdrawal','refund','wallet_topup','wallet_bonus')
     AND (TG_OP = 'INSERT' OR OLD.status <> 'paid') THEN
    _profile := COALESCE(NEW.creator_profile_id, public.default_paid_profile(NEW.creator_id));
    INSERT INTO public.creator_streak_days (creator_id, creator_profile_id, day, revenue_cents)
    VALUES (NEW.creator_id, _profile, NEW.created_at::date, NEW.net_cents)
    ON CONFLICT (creator_id, day) DO UPDATE
      SET revenue_cents = public.creator_streak_days.revenue_cents + NEW.net_cents,
          creator_profile_id = COALESCE(public.creator_streak_days.creator_profile_id, EXCLUDED.creator_profile_id),
          updated_at = now();
  END IF;
  RETURN NEW;
END; $$;

-- === pay_with_wallet: aceita _creator_profile_id opcional ===
CREATE OR REPLACE FUNCTION public.pay_with_wallet(
  _kind text,
  _publication_id uuid DEFAULT NULL::uuid,
  _message_id uuid DEFAULT NULL::uuid,
  _creator_id uuid DEFAULT NULL::uuid,
  _plan text DEFAULT NULL::text,
  _amount_cents integer DEFAULT NULL::integer,
  _message text DEFAULT NULL::text,
  _creator_profile_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _buyer UUID := auth.uid();
  _balance BIGINT;
  _amount BIGINT := 0;
  _creator UUID;
  _profile UUID;
  _ref_id UUID;
  _existing UUID;
  _price_monthly NUMERIC;
  _discount NUMERIC := 0;
  _months INT;
  _period_end TIMESTAMPTZ;
  _pub RECORD;
  _msg RECORD;
  _promo RECORD;
  _promotion_id UUID := NULL;
BEGIN
  IF _buyer IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  PERFORM public.ensure_subscriber_wallet(_buyer);
  SELECT balance_cents INTO _balance FROM public.subscriber_wallets WHERE user_id = _buyer FOR UPDATE;
  IF _balance IS NULL THEN RAISE EXCEPTION 'wallet_not_found'; END IF;

  IF _kind = 'publication_unlock' THEN
    IF _publication_id IS NULL THEN RAISE EXCEPTION 'publication_id_required'; END IF;
    SELECT id, author_id, price_cents, creator_profile_id INTO _pub
      FROM public.publications WHERE id = _publication_id;
    IF _pub.id IS NULL THEN RAISE EXCEPTION 'publication_not_found'; END IF;
    IF _pub.author_id = _buyer THEN RAISE EXCEPTION 'self_purchase_not_allowed'; END IF;
    IF COALESCE(_pub.price_cents,0) <= 0 THEN RAISE EXCEPTION 'publication_free'; END IF;

    _creator := _pub.author_id;
    _profile := COALESCE(_pub.creator_profile_id, public.default_paid_profile(_creator));
    _amount := _pub.price_cents;
    IF _balance < _amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

    SELECT id INTO _existing FROM public.publication_unlocks
      WHERE publication_id = _pub.id AND buyer_id = _buyer;
    IF _existing IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM public.publication_unlocks WHERE id = _existing AND status = 'paid') THEN
        RAISE EXCEPTION 'already_unlocked';
      END IF;
      UPDATE public.publication_unlocks
        SET amount_cents = _amount, provider = 'wallet', status = 'paid',
            provider_ref = NULL, creator_profile_id = _profile
        WHERE id = _existing;
      _ref_id := _existing;
    ELSE
      INSERT INTO public.publication_unlocks
        (publication_id, buyer_id, amount_cents, provider, status, creator_profile_id)
      VALUES (_pub.id, _buyer, _amount, 'wallet', 'paid', _profile)
      RETURNING id INTO _ref_id;
    END IF;

  ELSIF _kind = 'chat_unlock' THEN
    IF _message_id IS NULL THEN RAISE EXCEPTION 'message_id_required'; END IF;
    SELECT id, sender_id, price_cents INTO _msg FROM public.chat_messages WHERE id = _message_id;
    IF _msg.id IS NULL THEN RAISE EXCEPTION 'message_not_found'; END IF;
    IF _msg.sender_id = _buyer THEN RAISE EXCEPTION 'self_purchase_not_allowed'; END IF;
    IF COALESCE(_msg.price_cents,0) <= 0 THEN RAISE EXCEPTION 'message_free'; END IF;

    _creator := _msg.sender_id;
    _profile := COALESCE(_creator_profile_id, public.default_paid_profile(_creator));
    _amount := _msg.price_cents;
    IF _balance < _amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

    SELECT id INTO _existing FROM public.chat_message_unlocks
      WHERE message_id = _msg.id AND buyer_id = _buyer;
    IF _existing IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM public.chat_message_unlocks WHERE id = _existing AND status = 'paid') THEN
        RAISE EXCEPTION 'already_unlocked';
      END IF;
      UPDATE public.chat_message_unlocks
        SET amount_cents = _amount, provider = 'wallet', status = 'paid',
            provider_ref = NULL, creator_id = _creator, creator_profile_id = _profile
        WHERE id = _existing;
      _ref_id := _existing;
    ELSE
      INSERT INTO public.chat_message_unlocks
        (message_id, buyer_id, creator_id, amount_cents, provider, status, creator_profile_id)
      VALUES (_msg.id, _buyer, _creator, _amount, 'wallet', 'paid', _profile)
      RETURNING id INTO _ref_id;
    END IF;

  ELSIF _kind = 'subscription' THEN
    IF _creator_id IS NULL THEN RAISE EXCEPTION 'creator_id_required'; END IF;
    IF _plan NOT IN ('monthly','quarterly','semiannual') THEN RAISE EXCEPTION 'invalid_plan'; END IF;
    IF _creator_id = _buyer THEN RAISE EXCEPTION 'self_purchase_not_allowed'; END IF;

    SELECT price_monthly,
           CASE _plan
             WHEN 'quarterly' THEN COALESCE(discount_quarterly,0)
             WHEN 'semiannual' THEN COALESCE(discount_semiannual,0)
             ELSE 0 END
      INTO _price_monthly, _discount
      FROM public.profiles WHERE user_id = _creator_id;

    IF _price_monthly IS NULL OR _price_monthly <= 0 THEN RAISE EXCEPTION 'creator_no_plan'; END IF;

    _months := CASE _plan WHEN 'quarterly' THEN 3 WHEN 'semiannual' THEN 6 ELSE 1 END;
    _creator := _creator_id;
    _profile := COALESCE(_creator_profile_id, public.default_paid_profile(_creator));

    IF _plan = 'monthly' THEN
      SELECT id, promo_price, max_subscriptions, subscriptions_used INTO _promo
        FROM public.promotions
        WHERE creator_id = _creator AND status = 'active'
          AND starts_at <= now() AND ends_at > now()
          AND subscriptions_used < max_subscriptions
        ORDER BY promo_price ASC LIMIT 1 FOR UPDATE;
      IF _promo.id IS NOT NULL THEN
        _promotion_id := _promo.id;
        _amount := ROUND(_promo.promo_price * 100);
      ELSE
        _amount := ROUND(_price_monthly * 100 * (1 - _discount / 100.0));
      END IF;
    ELSE
      _amount := ROUND(_price_monthly * 100 * _months * (1 - _discount / 100.0));
    END IF;

    IF _balance < _amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

    IF EXISTS (SELECT 1 FROM public.subscriptions
               WHERE creator_id = _creator AND subscriber_id = _buyer
                 AND status = 'active' AND current_period_end > now()) THEN
      RAISE EXCEPTION 'already_subscribed';
    END IF;

    _period_end := now() + (_months || ' months')::interval;

    INSERT INTO public.subscriptions
      (creator_id, subscriber_id, plan, price_cents_paid, current_period_end,
       provider, status, promotion_id, creator_profile_id)
    VALUES (_creator, _buyer, _plan::public.subscription_plan, _amount, _period_end,
       'wallet', 'active', _promotion_id, _profile)
    RETURNING id INTO _ref_id;

  ELSIF _kind = 'tip' THEN
    IF _creator_id IS NULL THEN RAISE EXCEPTION 'creator_id_required'; END IF;
    IF _creator_id = _buyer THEN RAISE EXCEPTION 'self_purchase_not_allowed'; END IF;
    IF _amount_cents IS NULL OR _amount_cents < 500 THEN RAISE EXCEPTION 'tip_min_amount'; END IF;

    _creator := _creator_id;
    _profile := COALESCE(_creator_profile_id, public.default_paid_profile(_creator));
    _amount := _amount_cents;
    IF _balance < _amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

    INSERT INTO public.tips
      (creator_id, sender_id, publication_id, amount_cents, message, provider, status, creator_profile_id)
    VALUES (_creator, _buyer, _publication_id, _amount,
            NULLIF(LEFT(COALESCE(_message,''), 300), ''), 'wallet', 'paid', _profile)
    RETURNING id INTO _ref_id;

  ELSE
    RAISE EXCEPTION 'unsupported_kind:%', _kind;
  END IF;

  UPDATE public.subscriber_wallets
    SET balance_cents = balance_cents - _amount, updated_at = now()
    WHERE user_id = _buyer;

  RETURN jsonb_build_object(
    'ok', true, 'kind', _kind, 'referenceId', _ref_id,
    'creatorId', _creator, 'creatorProfileId', _profile,
    'amountCents', _amount, 'newBalanceCents', _balance - _amount,
    'promotionId', _promotion_id
  );
END; $$;
