
-- 1) Coluna de controle para evitar dupla contagem no release
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS wallet_released_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS transactions_pending_release_idx
  ON public.transactions (released_at)
  WHERE wallet_released_at IS NULL
    AND status = 'paid'
    AND net_cents > 0;

-- 2) Função que libera ganhos maduros
CREATE OR REPLACE FUNCTION public.release_matured_earnings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row RECORD;
  _count INTEGER := 0;
BEGIN
  FOR _row IN
    SELECT id, creator_id, net_cents, is_international
      FROM public.transactions
     WHERE status = 'paid'
       AND net_cents > 0
       AND wallet_released_at IS NULL
       AND released_at IS NOT NULL
       AND released_at <= now()
       AND kind NOT IN ('withdrawal','refund','wallet_topup','wallet_bonus')
       AND creator_id IS NOT NULL
     FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.ensure_creator_wallet(_row.creator_id);

    IF _row.is_international THEN
      UPDATE public.creator_wallets
        SET pending_international_cents = GREATEST(pending_international_cents - _row.net_cents, 0),
            released_cents = released_cents + _row.net_cents,
            updated_at = now()
        WHERE user_id = _row.creator_id;
    ELSE
      UPDATE public.creator_wallets
        SET pending_national_cents = GREATEST(pending_national_cents - _row.net_cents, 0),
            released_cents = released_cents + _row.net_cents,
            updated_at = now()
        WHERE user_id = _row.creator_id;
    END IF;

    UPDATE public.transactions
      SET wallet_released_at = now()
      WHERE id = _row.id;

    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;

-- 3) Trigger reescrito: estorno debita do bucket correto
CREATE OR REPLACE FUNCTION public.transactions_apply_wallet_effects()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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

    IF NEW.released_at IS NULL THEN
      IF NEW.is_international THEN
        NEW.released_at := now() + INTERVAL '15 days';
      ELSIF NEW.payment_method = 'credit_card' THEN
        NEW.released_at := now() + INTERVAL '15 days';
      ELSIF NEW.payment_method = 'boleto' THEN
        NEW.released_at := now() + INTERVAL '2 days';
      ELSE
        NEW.released_at := now();
      END IF;
    END IF;

    IF NEW.released_at <= now() THEN
      UPDATE public.creator_wallets
        SET released_cents = released_cents + NEW.net_cents,
            updated_at = now()
        WHERE user_id = NEW.creator_id;
      NEW.wallet_released_at := now();
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

    IF NEW.access_until IS NULL AND NEW.kind IN ('publication_unlock','chat_unlock') THEN
      NEW.access_until := now() + INTERVAL '60 days';
    END IF;
  END IF;

  IF became_paid AND NEW.kind IN ('wallet_topup','wallet_bonus')
     AND NEW.buyer_id IS NOT NULL AND NEW.amount_cents_gross > 0 THEN
    PERFORM public.ensure_subscriber_wallet(NEW.buyer_id);
    UPDATE public.subscriber_wallets
      SET balance_cents = balance_cents + NEW.amount_cents_gross,
          updated_at = now()
      WHERE user_id = NEW.buyer_id;
  END IF;

  -- Estorno: debita do bucket correto (pendente x liberado) baseado em wallet_released_at
  IF became_refunded AND NEW.creator_id IS NOT NULL AND NEW.net_cents > 0
     AND NEW.kind NOT IN ('withdrawal','refund','wallet_topup','wallet_bonus') THEN
    IF OLD.wallet_released_at IS NOT NULL THEN
      UPDATE public.creator_wallets
        SET released_cents = GREATEST(released_cents - NEW.net_cents, 0),
            updated_at = now()
        WHERE user_id = NEW.creator_id;
    ELSIF NEW.is_international THEN
      UPDATE public.creator_wallets
        SET pending_international_cents = GREATEST(pending_international_cents - NEW.net_cents, 0),
            updated_at = now()
        WHERE user_id = NEW.creator_id;
    ELSE
      UPDATE public.creator_wallets
        SET pending_national_cents = GREATEST(pending_national_cents - NEW.net_cents, 0),
            updated_at = now()
        WHERE user_id = NEW.creator_id;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- 4) Marca como já liberadas as transações antigas que estavam no bucket "liberado"
--    (evita que o release_matured_earnings tente movê-las novamente)
UPDATE public.transactions
  SET wallet_released_at = COALESCE(released_at, created_at)
  WHERE status = 'paid'
    AND net_cents > 0
    AND wallet_released_at IS NULL
    AND released_at IS NOT NULL
    AND released_at <= now()
    AND kind NOT IN ('withdrawal','refund','wallet_topup','wallet_bonus');
