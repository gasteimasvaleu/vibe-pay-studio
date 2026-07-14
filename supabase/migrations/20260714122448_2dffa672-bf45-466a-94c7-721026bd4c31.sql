CREATE OR REPLACE FUNCTION public.pay_with_wallet(
  _kind TEXT,
  _publication_id UUID DEFAULT NULL,
  _message_id UUID DEFAULT NULL,
  _creator_id UUID DEFAULT NULL,
  _plan TEXT DEFAULT NULL,
  _amount_cents INTEGER DEFAULT NULL,
  _message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _buyer UUID := auth.uid();
  _balance BIGINT;
  _amount BIGINT := 0;
  _creator UUID;
  _ref_id UUID;
  _existing UUID;
  _price_monthly NUMERIC;
  _discount NUMERIC := 0;
  _months INT;
  _period_end TIMESTAMPTZ;
  _pub RECORD;
  _msg RECORD;
BEGIN
  IF _buyer IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Lock wallet (create if missing)
  PERFORM public.ensure_subscriber_wallet(_buyer);
  SELECT balance_cents INTO _balance
    FROM public.subscriber_wallets
    WHERE user_id = _buyer
    FOR UPDATE;

  IF _balance IS NULL THEN
    RAISE EXCEPTION 'wallet_not_found';
  END IF;

  IF _kind = 'publication_unlock' THEN
    IF _publication_id IS NULL THEN RAISE EXCEPTION 'publication_id_required'; END IF;
    SELECT id, author_id, price_cents INTO _pub
      FROM public.publications WHERE id = _publication_id;
    IF _pub.id IS NULL THEN RAISE EXCEPTION 'publication_not_found'; END IF;
    IF _pub.author_id = _buyer THEN RAISE EXCEPTION 'self_purchase_not_allowed'; END IF;
    IF COALESCE(_pub.price_cents,0) <= 0 THEN RAISE EXCEPTION 'publication_free'; END IF;

    _creator := _pub.author_id;
    _amount := _pub.price_cents;

    IF _balance < _amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

    -- Handle existing pending / paid rows
    SELECT id INTO _existing
      FROM public.publication_unlocks
      WHERE publication_id = _pub.id AND buyer_id = _buyer;

    IF _existing IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM public.publication_unlocks
                 WHERE id = _existing AND status = 'paid') THEN
        RAISE EXCEPTION 'already_unlocked';
      END IF;
      UPDATE public.publication_unlocks
        SET amount_cents = _amount, provider = 'wallet', status = 'paid', provider_ref = NULL
        WHERE id = _existing;
      _ref_id := _existing;
    ELSE
      INSERT INTO public.publication_unlocks (publication_id, buyer_id, amount_cents, provider, status)
        VALUES (_pub.id, _buyer, _amount, 'wallet', 'paid')
        RETURNING id INTO _ref_id;
    END IF;

  ELSIF _kind = 'chat_unlock' THEN
    IF _message_id IS NULL THEN RAISE EXCEPTION 'message_id_required'; END IF;
    SELECT id, sender_id, price_cents INTO _msg
      FROM public.chat_messages WHERE id = _message_id;
    IF _msg.id IS NULL THEN RAISE EXCEPTION 'message_not_found'; END IF;
    IF _msg.sender_id = _buyer THEN RAISE EXCEPTION 'self_purchase_not_allowed'; END IF;
    IF COALESCE(_msg.price_cents,0) <= 0 THEN RAISE EXCEPTION 'message_free'; END IF;

    _creator := _msg.sender_id;
    _amount := _msg.price_cents;

    IF _balance < _amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

    SELECT id INTO _existing
      FROM public.chat_message_unlocks
      WHERE message_id = _msg.id AND buyer_id = _buyer;

    IF _existing IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM public.chat_message_unlocks
                 WHERE id = _existing AND status = 'paid') THEN
        RAISE EXCEPTION 'already_unlocked';
      END IF;
      UPDATE public.chat_message_unlocks
        SET amount_cents = _amount, provider = 'wallet', status = 'paid', provider_ref = NULL,
            creator_id = _creator
        WHERE id = _existing;
      _ref_id := _existing;
    ELSE
      INSERT INTO public.chat_message_unlocks (message_id, buyer_id, creator_id, amount_cents, provider, status)
        VALUES (_msg.id, _buyer, _creator, _amount, 'wallet', 'paid')
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
             ELSE 0
           END
      INTO _price_monthly, _discount
      FROM public.profiles WHERE user_id = _creator_id;

    IF _price_monthly IS NULL OR _price_monthly <= 0 THEN
      RAISE EXCEPTION 'creator_no_plan';
    END IF;

    _months := CASE _plan WHEN 'quarterly' THEN 3 WHEN 'semiannual' THEN 6 ELSE 1 END;
    _amount := ROUND(_price_monthly * 100 * _months * (1 - _discount / 100.0));
    _creator := _creator_id;

    IF _balance < _amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

    -- Block if already active
    IF EXISTS (SELECT 1 FROM public.subscriptions
               WHERE creator_id = _creator AND subscriber_id = _buyer
                 AND status = 'active' AND current_period_end > now()) THEN
      RAISE EXCEPTION 'already_subscribed';
    END IF;

    _period_end := now() + (_months || ' months')::interval;

    INSERT INTO public.subscriptions
      (creator_id, subscriber_id, plan, price_cents_paid, current_period_end, provider, status)
      VALUES (_creator, _buyer, _plan::public.subscription_plan, _amount, _period_end, 'wallet', 'active')
      RETURNING id INTO _ref_id;

  ELSIF _kind = 'tip' THEN
    IF _creator_id IS NULL THEN RAISE EXCEPTION 'creator_id_required'; END IF;
    IF _creator_id = _buyer THEN RAISE EXCEPTION 'self_purchase_not_allowed'; END IF;
    IF _amount_cents IS NULL OR _amount_cents < 500 THEN RAISE EXCEPTION 'tip_min_amount'; END IF;

    _creator := _creator_id;
    _amount := _amount_cents;

    IF _balance < _amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

    INSERT INTO public.tips (creator_id, sender_id, publication_id, amount_cents, message, provider, status)
      VALUES (_creator, _buyer, _publication_id, _amount,
              NULLIF(LEFT(COALESCE(_message,''), 300), ''), 'wallet', 'paid')
      RETURNING id INTO _ref_id;

  ELSE
    RAISE EXCEPTION 'unsupported_kind:%', _kind;
  END IF;

  -- Debit wallet
  UPDATE public.subscriber_wallets
    SET balance_cents = balance_cents - _amount,
        updated_at = now()
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

REVOKE ALL ON FUNCTION public.pay_with_wallet(TEXT, UUID, UUID, UUID, TEXT, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_with_wallet(TEXT, UUID, UUID, UUID, TEXT, INTEGER, TEXT) TO authenticated;