CREATE OR REPLACE FUNCTION public.pay_with_wallet(
  _kind text,
  _publication_id uuid DEFAULT NULL::uuid,
  _message_id uuid DEFAULT NULL::uuid,
  _creator_id uuid DEFAULT NULL::uuid,
  _plan text DEFAULT NULL::text,
  _amount_cents integer DEFAULT NULL::integer,
  _message text DEFAULT NULL::text,
  _creator_profile_id uuid DEFAULT NULL::uuid,
  _call_id uuid DEFAULT NULL::uuid,
  _request_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
  _call RECORD;
  _req RECORD;
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

  ELSIF _kind = 'video_call' THEN
    IF _call_id IS NULL THEN RAISE EXCEPTION 'call_id_required'; END IF;
    SELECT id, creator_id, requester_id, price_cents, expires_at INTO _call
      FROM public.video_calls WHERE id = _call_id;
    IF _call.id IS NULL THEN RAISE EXCEPTION 'call_not_found'; END IF;
    IF _call.requester_id <> _buyer THEN RAISE EXCEPTION 'only_requester_can_pay'; END IF;
    IF _call.creator_id = _buyer THEN RAISE EXCEPTION 'self_purchase_not_allowed'; END IF;
    IF COALESCE(_call.price_cents,0) <= 0 THEN RAISE EXCEPTION 'call_free'; END IF;
    IF _call.expires_at IS NOT NULL AND _call.expires_at < now() THEN RAISE EXCEPTION 'call_expired'; END IF;

    _creator := _call.creator_id;
    _profile := COALESCE(_creator_profile_id, public.default_paid_profile(_creator));
    _amount := _call.price_cents;
    IF _balance < _amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

    UPDATE public.video_calls
      SET status = 'accepted', payment_status = 'paid', provider = 'wallet',
          provider_ref = NULL, creator_profile_id = _profile, updated_at = now()
      WHERE id = _call.id AND status = 'pending_payment';
    IF NOT FOUND THEN RAISE EXCEPTION 'already_paid_or_cancelled'; END IF;
    _ref_id := _call.id;

  ELSIF _kind = 'paid_dm' THEN
    IF _request_id IS NULL THEN RAISE EXCEPTION 'request_id_required'; END IF;
    SELECT id, creator_id, requester_id, price_cents INTO _req
      FROM public.chat_media_requests WHERE id = _request_id;
    IF _req.id IS NULL THEN RAISE EXCEPTION 'request_not_found'; END IF;
    IF _req.requester_id <> _buyer THEN RAISE EXCEPTION 'only_requester_can_pay'; END IF;
    IF _req.creator_id = _buyer THEN RAISE EXCEPTION 'self_purchase_not_allowed'; END IF;
    IF COALESCE(_req.price_cents,0) <= 0 THEN RAISE EXCEPTION 'request_free'; END IF;

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
END;
$$;

-- Retroativo: convites de videochamada já pagos (via webhook) mas ainda em pending_payment
-- devem ficar disponíveis para entrar na sala.
UPDATE public.video_calls
  SET status = 'accepted', updated_at = now()
  WHERE status = 'pending_payment' AND payment_status = 'paid';