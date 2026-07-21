
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  creator_profile_id UUID,
  media_path TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image','video')),
  thumb_path TEXT,
  price_cents INT NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  caption TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX stories_creator_expires_idx ON public.stories(creator_id, expires_at DESC);
CREATE INDEX stories_expires_idx ON public.stories(expires_at DESC);

GRANT SELECT, INSERT, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stories_select_active_or_own" ON public.stories
  FOR SELECT TO authenticated
  USING (creator_id = auth.uid() OR expires_at > now());

CREATE POLICY "stories_insert_own_creator" ON public.stories
  FOR INSERT TO authenticated
  WITH CHECK (
    creator_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.account_type IN ('creator','free_creator')
    )
  );

CREATE POLICY "stories_delete_own" ON public.stories
  FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

CREATE TRIGGER stories_set_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.stories_fill_profile()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.creator_profile_id IS NULL AND NEW.creator_id IS NOT NULL THEN
    NEW.creator_profile_id := public.resolve_active_profile(NEW.creator_id);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER stories_fill_profile_trg
  BEFORE INSERT ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.stories_fill_profile();

CREATE TABLE public.story_unlocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  creator_profile_id UUID,
  amount_cents INT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'wallet',
  provider_ref TEXT,
  status TEXT NOT NULL DEFAULT 'paid',
  transaction_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(story_id, buyer_id)
);
CREATE INDEX story_unlocks_buyer_idx ON public.story_unlocks(buyer_id);

GRANT SELECT, INSERT, UPDATE ON public.story_unlocks TO authenticated;
GRANT ALL ON public.story_unlocks TO service_role;
ALTER TABLE public.story_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_unlocks_select_own" ON public.story_unlocks
  FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR creator_id = auth.uid());

CREATE POLICY "story_unlocks_insert_own_buyer" ON public.story_unlocks
  FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.story_unlocks_prevent_self_purchase()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _author UUID;
BEGIN
  SELECT creator_id INTO _author FROM public.stories WHERE id = NEW.story_id;
  IF _author IS NOT NULL AND _author = NEW.buyer_id THEN
    RAISE EXCEPTION 'buyer cannot unlock own story';
  END IF;
  IF NEW.creator_id IS NULL THEN NEW.creator_id := _author; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER story_unlocks_prevent_self_purchase_trg
  BEFORE INSERT ON public.story_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.story_unlocks_prevent_self_purchase();

CREATE OR REPLACE FUNCTION public.story_unlocks_fill_profile()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.creator_profile_id IS NULL AND NEW.creator_id IS NOT NULL THEN
    NEW.creator_profile_id := public.resolve_active_profile(NEW.creator_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER story_unlocks_fill_profile_trg
  BEFORE INSERT ON public.story_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.story_unlocks_fill_profile();

CREATE OR REPLACE FUNCTION public.story_unlocks_sync_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
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
    'story_unlock','paid', NEW.buyer_id, NEW.creator_id, _profile,
    NEW.amount_cents, _split.platform_fee_cents, _split.gateway_fee_cents, _split.net_cents, _split.commission_pct_applied,
    _method, COALESCE(NEW.provider,'manual'), NEW.provider_ref, 'story_unlocks', NEW.id
  ) RETURNING id INTO _tx_id;

  NEW.transaction_id := _tx_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER story_unlocks_sync_transaction_trg
  BEFORE INSERT OR UPDATE ON public.story_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.story_unlocks_sync_transaction();

CREATE TABLE public.story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);
CREATE INDEX story_views_viewer_idx ON public.story_views(viewer_id);

GRANT SELECT, INSERT ON public.story_views TO authenticated;
GRANT ALL ON public.story_views TO service_role;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_views_select_own_or_author" ON public.story_views
  FOR SELECT TO authenticated
  USING (
    viewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.creator_id = auth.uid())
  );

CREATE POLICY "story_views_insert_own" ON public.story_views
  FOR INSERT TO authenticated
  WITH CHECK (viewer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.can_see_story(_story_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stories s
    WHERE s.id = _story_id
      AND (
        s.creator_id = auth.uid()
        OR COALESCE(s.price_cents,0) = 0
        OR EXISTS (
          SELECT 1 FROM public.story_unlocks u
          WHERE u.story_id = s.id AND u.buyer_id = auth.uid() AND u.status = 'paid'
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.pay_with_wallet(
  _kind text,
  _publication_id uuid DEFAULT NULL,
  _message_id uuid DEFAULT NULL,
  _creator_id uuid DEFAULT NULL,
  _plan text DEFAULT NULL,
  _amount_cents integer DEFAULT NULL,
  _message text DEFAULT NULL,
  _creator_profile_id uuid DEFAULT NULL,
  _story_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  _story RECORD;
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

  ELSIF _kind = 'story_unlock' THEN
    IF _story_id IS NULL THEN RAISE EXCEPTION 'story_id_required'; END IF;
    SELECT id, creator_id, price_cents, creator_profile_id, expires_at INTO _story
      FROM public.stories WHERE id = _story_id;
    IF _story.id IS NULL THEN RAISE EXCEPTION 'story_not_found'; END IF;
    IF _story.expires_at <= now() THEN RAISE EXCEPTION 'story_expired'; END IF;
    IF _story.creator_id = _buyer THEN RAISE EXCEPTION 'self_purchase_not_allowed'; END IF;
    IF COALESCE(_story.price_cents,0) <= 0 THEN RAISE EXCEPTION 'story_free'; END IF;

    _creator := _story.creator_id;
    _profile := COALESCE(_story.creator_profile_id, public.default_paid_profile(_creator));
    _amount := _story.price_cents;
    IF _balance < _amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

    SELECT id INTO _existing FROM public.story_unlocks
      WHERE story_id = _story.id AND buyer_id = _buyer;
    IF _existing IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM public.story_unlocks WHERE id = _existing AND status = 'paid') THEN
        RAISE EXCEPTION 'already_unlocked';
      END IF;
      UPDATE public.story_unlocks
        SET amount_cents = _amount, provider = 'wallet', status = 'paid',
            provider_ref = NULL, creator_id = _creator, creator_profile_id = _profile
        WHERE id = _existing;
      _ref_id := _existing;
    ELSE
      INSERT INTO public.story_unlocks
        (story_id, buyer_id, creator_id, amount_cents, provider, status, creator_profile_id)
      VALUES (_story.id, _buyer, _creator, _amount, 'wallet', 'paid', _profile)
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

CREATE POLICY "stories_read_authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'stories');

CREATE POLICY "stories_insert_own_prefix" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stories' AND (auth.uid()::text = (storage.foldername(name))[1]));

CREATE POLICY "stories_delete_own_prefix" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'stories' AND (auth.uid()::text = (storage.foldername(name))[1]));
