ALTER TABLE public.subscriber_wallets
  ADD COLUMN IF NOT EXISTS debt_cents bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;

-- Carteira bloqueada não pode ser debitada (cobre todas as versões de pay_with_wallet).
CREATE OR REPLACE FUNCTION public.subscriber_wallets_block_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.blocked_at IS NOT NULL AND NEW.balance_cents < OLD.balance_cents
     AND coalesce(current_setting('app.wallet_reversal', true), '') <> 'on' THEN
    RAISE EXCEPTION 'wallet_blocked';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_subscriber_wallets_block_guard ON public.subscriber_wallets;
CREATE TRIGGER trg_subscriber_wallets_block_guard BEFORE UPDATE ON public.subscriber_wallets
  FOR EACH ROW EXECUTE FUNCTION public.subscriber_wallets_block_guard();

CREATE OR REPLACE FUNCTION public.reverse_wallet_topup(_provider_ref text, _amount_cents bigint, _event text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tx record; _bal bigint; _amt bigint; _debit bigint; _debt bigint; _partial boolean;
BEGIN
  SELECT id, buyer_id, amount_cents_gross, status INTO _tx FROM transactions
   WHERE provider_ref = _provider_ref AND kind = 'wallet_topup' FOR UPDATE;
  IF _tx.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _tx.status <> 'paid' THEN RETURN jsonb_build_object('ok', true, 'reason', 'already_processed'); END IF;

  _amt := LEAST(coalesce(nullif(_amount_cents,0), _tx.amount_cents_gross), _tx.amount_cents_gross);
  _partial := _amt < _tx.amount_cents_gross;

  UPDATE transactions SET status = CASE WHEN _partial THEN 'partially_refunded'::transaction_status ELSE 'refunded'::transaction_status END
   WHERE id = _tx.id;

  PERFORM ensure_subscriber_wallet(_tx.buyer_id);
  SELECT balance_cents INTO _bal FROM subscriber_wallets WHERE user_id = _tx.buyer_id FOR UPDATE;
  _debit := LEAST(_bal, _amt);
  _debt := _amt - _debit;

  PERFORM set_config('app.wallet_reversal', 'on', true);
  UPDATE subscriber_wallets SET
    balance_cents = balance_cents - _debit,
    debt_cents = debt_cents + _debt,
    blocked_at = CASE WHEN _debt > 0 THEN coalesce(blocked_at, now()) ELSE blocked_at END,
    blocked_reason = CASE WHEN _debt > 0 THEN _event || ' em recarga ' || _provider_ref || ': faltaram ' || _debt || ' centavos' ELSE blocked_reason END,
    reviewed_at = CASE WHEN _debt > 0 THEN NULL ELSE reviewed_at END,
    updated_at = now()
   WHERE user_id = _tx.buyer_id;
  PERFORM set_config('app.wallet_reversal', 'off', true);

  RETURN jsonb_build_object('ok', true, 'debited', _debit, 'debt', _debt);
END $$;
REVOKE EXECUTE ON FUNCTION public.reverse_wallet_topup(text, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_wallet_topup(text, bigint, text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_unblock_wallet(_user_id uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE subscriber_wallets SET blocked_at = NULL, reviewed_at = now(), reviewed_by = auth.uid(),
    blocked_reason = coalesce(blocked_reason,'') || ' | liberado: ' || coalesce(_note,''), updated_at = now()
   WHERE user_id = _user_id;
  INSERT INTO audit_logs(actor_id, action, target_table, target_id, metadata)
   VALUES (auth.uid(), 'wallet.unblocked', 'subscriber_wallets', _user_id::text, jsonb_build_object('note', _note));
EXCEPTION WHEN undefined_column THEN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_unblock_wallet(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_unblock_wallet(uuid, text) TO authenticated;