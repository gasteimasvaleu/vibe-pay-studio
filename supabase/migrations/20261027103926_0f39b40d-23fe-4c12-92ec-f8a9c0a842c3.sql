CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount_cents bigint, _pix_key text, _pix_key_type text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _released bigint;
  _used bigint;
  _profile_id uuid;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'não autenticado'; END IF;
  IF _amount_cents IS NULL OR _amount_cents < 5000 THEN RAISE EXCEPTION 'valor mínimo de saque: R$ 50,00'; END IF;
  IF coalesce(trim(_pix_key),'') = '' THEN RAISE EXCEPTION 'chave pix obrigatória'; END IF;

  SELECT released_cents INTO _released FROM creator_wallets WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'carteira não encontrada'; END IF;

  SELECT coalesce(sum(amount_cents),0) INTO _used FROM withdrawals
   WHERE creator_id = _uid AND status IN ('requested','in_review','approved','paid');

  IF coalesce(_released,0) - _used < _amount_cents THEN
    RAISE EXCEPTION 'saldo liberado insuficiente';
  END IF;

  BEGIN
    SELECT (public.resolve_active_creator_profile(_uid)).id INTO _profile_id;
  EXCEPTION WHEN others THEN _profile_id := NULL;
  END;

  INSERT INTO withdrawals (creator_id, creator_profile_id, amount_cents, fee_cents, net_cents, pix_key, pix_key_type, status, is_first_withdrawal, provider)
  VALUES (_uid, _profile_id, _amount_cents, 0, _amount_cents, trim(_pix_key), _pix_key_type, 'requested', false, 'asaas')
  RETURNING id INTO _id;
  RETURN _id;
END $$;

REVOKE EXECUTE ON FUNCTION public.request_withdrawal(bigint, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(bigint, text, text) TO authenticated;

DROP POLICY IF EXISTS "creator requests own withdrawal" ON public.withdrawals;