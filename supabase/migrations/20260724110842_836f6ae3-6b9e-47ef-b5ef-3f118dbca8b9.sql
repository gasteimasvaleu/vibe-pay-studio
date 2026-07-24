
CREATE OR REPLACE FUNCTION public.pay_with_wallet(
  _kind TEXT,
  _publication_id UUID DEFAULT NULL,
  _message_id UUID DEFAULT NULL,
  _creator_id UUID DEFAULT NULL,
  _plan TEXT DEFAULT NULL,
  _amount_cents INTEGER DEFAULT NULL,
  _message TEXT DEFAULT NULL,
  _story_id UUID DEFAULT NULL,
  _call_id UUID DEFAULT NULL,
  _request_id UUID DEFAULT NULL,
  _creator_profile_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _buyer UUID := auth.uid();
  _balance INTEGER;
  _amount INTEGER;
  _creator UUID;
  _profile UUID;
  _ref_id UUID;
  _months INTEGER;
  _price_monthly NUMERIC;
  _discount NUMERIC;
  _period_end TIMESTAMPTZ;
  _promotion_id UUID;
  _promo RECORD;
  _pub RECORD;
  _msg RECORD;
  _story RECORD;
  _req RECORD;
  _call RECORD;
  _existing RECORD;
  _existing_months INTEGER;
  _remaining_ms BIGINT;
BEGIN
  IF _buyer IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT balance_cents INTO _balance
    FROM public.subscriber_wallets
    WHERE user_id = _buyer FOR UPDATE;
  IF _balance IS NULL THEN
    INSERT INTO public.subscriber_wallets (user_id, balance_cents)
      VALUES (_buyer, 0)
      ON CONFLICT (user_id) DO NOTHING;
    _balance := 0;
  END IF;

  IF _kind = 'publication_unlock' THEN
    IF _publication_id IS NULL THEN RAISE EXCEPTION 'publication_id_required'; END IF;
    SELECT id, author_id, price_cents, creator_profile_id INTO _pub
      FROM public.publications WHERE id = _publication_id;
    IF _pub.id IS NULL THEN RAISE EXCEPTION 'publication_not_found'; END IF;
    IF _pub.price_cents IS NULL OR _pub.price_cents <= 0 THEN
      RAISE EXCEPTION 'publication_not_paid';
    END IF;
    IF _pub.author_id = _buyer THEN RAISE EXCEPTION 'self_purchase_not_allowed'; END IF;

    _creator := _pub.author_id;
    _profile := COALESCE(_creator_profile_id, _pub.creator_profile_id, public.default_paid_profile(_creator));
    _amount := _pub.price_cents;
    IF _balance < _amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

    INSERT INTO public.publication_unlocks
      (publication_id, buyer_id, amount_cents, status, provider, creator_profile_id)
    VALUES (_pub.id, _buyer, _amount, 'paid', 'wallet', _profile)
    RETURNING id INTO _ref_id;

  ELSIF _kind = 'chat_unlock' THEN
    IF _message_id IS NULL THEN RAISE EXCEPTION 'message_id_required'; END IF;
    SELECT id, sender_id, price_cents, creator_profile_id INTO _msg
      FROM public.chat_messages WHERE id = _message_id;
    IF _msg.id IS NULL THEN RAISE EXCEPTION 'message_not_found'; END IF;
    IF _msg.price_cents IS NULL OR _msg.price_cents <= 0 THEN
      RAISE EXCEPTION 'message_not_paid';
    END IF;
    IF _msg.sender_id = _buyer THEN RAISE EXCEPTION 'self_purchase_not_allowed'; END IF;

    _creator := _msg.sender_id;
    _profile := COALESCE(_creator_profile_id, _msg.creator_profile_id, public.default_paid_profile(_creator));
    _amount := _msg.price_cents;
    IF _balance < _amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

    INSERT INTO public.chat_message_unlocks
      (message_id, buyer_id, amount_cents, status, provider, creator_profile_id)
    VALUES (_msg.id, _buyer, _amount, 'paid', 'wallet', _profile)
    RETURNING id INTO _ref_id;

  ELSIF _kind = 'story_unlock' THEN
    IF _story_id IS NULL THEN RAISE EXCEPTION 'story_id_required'; END IF;
    SELECT id, author_id, price_cents, creator_profile_id INTO _story
      FROM public.stories WHERE id = _story_id;
    IF _story.id IS NULL THEN RAISE EXCEPTION 'story_not_found'; END IF;
    IF _story.price_cents IS NULL OR _story.price_cents <= 0 THEN
      RAISE EXCEPTION 'story_not_paid';
    END IF;
    IF _story.author_id = _buyer THEN RAISE EXCEPTION 'self_purchase_not_allowed'; END IF;

    _creator := _story.author_id;
    _profile := COALESCE(_creator_profile_id, _story.creator_profile_id, public.default_paid_profile(_creator));
    _amount := _story.price_cents;
    IF _balance < _amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

    INSERT INTO public.story_unlocks
      (story_id, buyer_id, amount_cents, status, provider, creator_profile_id)
    VALUES (_story.id, _buyer, _amount, 'paid', 'wallet', _profile)
    RETURNING id INTO _ref_id;

  ELSIF _kind = 'video_call' THEN
    IF _call_id IS NULL THEN RAISE EXCEPTION 'call_id_required'; END IF;
    SELECT id, creator_id, price_cents, creator_profile_id INTO _call
      FROM public.video_calls WHERE id = _call_id;
    IF _call.id IS NULL THEN RAISE EXCEPTION 'call_not_found'; END IF;
    IF _call.price_cents IS NULL OR _call.price_cents <= 0 THEN
      RAISE EXCEPTION 'call_not_paid';
    END IF;
    IF _call.creator_id = _buyer THEN RAISE EXCEPTION 'self_purchase_not_allowed'; END IF;

    _creator := _call.creator_id;
    _profile := COALESCE(_creator_profile_id, _call.creator_profile_id, public.default_paid_profile(_creator));
    _amount := _call.price_cents;
    IF _balance < _amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

    UPDATE public.video_calls
      SET payment_status = 'paid', provider = 'wallet', updated_at = now(),
          creator_profile_id = _profile
      WHERE id = _call.id AND payment_status = 'pending';
    IF NOT FOUND THEN RAISE EXCEPTION 'already_paid_or_cancelled'; END IF;
    _ref_id := _call.id;

  ELSIF _kind = 'paid_dm' THEN
    IF _request_id IS NULL THEN RAISE EXCEPTION 'request_id_required'; END IF;
    SELECT id, creator_id, price_cents, status INTO _req
      FROM public.chat_media_requests WHERE id = _request_id;
    IF _req.id IS NULL THEN RAISE EXCEPTION 'request_not_found'; END IF;
    IF _req.status <> 'pending_payment' THEN RAISE EXCEPTION 'invalid_status'; END IF;

    _creator := _req.creator_id;
    _profile := COALESCE(_creator_profile_id, public.default_paid_profile(_creator));
    _amount := _req.price_cents;
    IF _balance < _amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

    UPDATE public.chat_media_requests
      SET status = 'paid', provider = 'wallet', provider_ref = NULL,
          creator_profile_id = _profile, updated_at = now()
      WHERE id = _req.id AND status = 'pending_payment';
    IF NOT FOUND THEN RAISE EXCEPTION 'already_paid_or_cancelled'; END IF;
    _ref_id := _req.id;

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

    IF _price_monthly IS NULL OR _price_monthly <= 0 THEN
      RAISE EXCEPTION 'creator_no_plan';
    END IF;

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

    -- Verifica assinatura ativa existente para lidar com upgrade
    SELECT id, plan, current_period_end
      INTO _existing
      FROM public.subscriptions
      WHERE creator_id = _creator
        AND subscriber_id = _buyer
        AND status = 'active'
        AND current_period_end > now()
      ORDER BY current_period_end DESC
      LIMIT 1
      FOR UPDATE;

    IF _existing.id IS NOT NULL THEN
      _existing_months := CASE _existing.plan
        WHEN 'quarterly' THEN 3
        WHEN 'semiannual' THEN 6
        ELSE 1 END;
      IF _months <= _existing_months THEN
        RAISE EXCEPTION 'plan_downgrade_not_allowed';
      END IF;
      -- soma dias restantes do plano atual
      _period_end := now()
        + (_months || ' months')::interval
        + (_existing.current_period_end - now());
      -- marca a assinatura anterior como substituída
      UPDATE public.subscriptions
        SET status = 'superseded',
            auto_renew = false,
            cancelled_at = now()
        WHERE id = _existing.id;
    ELSE
      _period_end := now() + (_months || ' months')::interval;
    END IF;

    INSERT INTO public.subscriptions
      (creator_id, subscriber_id, plan, price_cents_paid, current_period_end,
       provider, status, promotion_id, creator_profile_id, started_at)
    VALUES (_creator, _buyer, _plan::public.subscription_plan, _amount, _period_end,
       'wallet', 'active', _promotion_id, _profile, now())
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
    'ok', true,
    'kind', _kind,
    'referenceId', _ref_id,
    'creatorId', _creator,
    'amountCents', _amount,
    'newBalanceCents', _balance - _amount
  );
END;
$$;
