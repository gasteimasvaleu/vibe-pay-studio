
-- 1) Ban columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- 2) Helper to check if user is banned (security definer, callable by app)
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND banned_at IS NOT NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_user_banned(uuid) TO authenticated, anon;

-- 3) Seed admin role for caiorobbb@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('ef28932d-d010-4904-8349-dac4a73758a5', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 4) Admin-only global financial summary function
CREATE OR REPLACE FUNCTION public.admin_financial_summary(_from timestamptz, _to timestamptz)
RETURNS TABLE(
  gross_cents bigint,
  platform_fee_cents bigint,
  gateway_fee_cents bigint,
  net_cents bigint,
  tx_count bigint,
  paying_users bigint,
  earning_creators bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(t.amount_cents_gross), 0)::bigint,
    COALESCE(SUM(t.platform_fee_cents), 0)::bigint,
    COALESCE(SUM(t.gateway_fee_cents), 0)::bigint,
    COALESCE(SUM(t.net_cents), 0)::bigint,
    COUNT(*)::bigint,
    COUNT(DISTINCT t.buyer_id)::bigint,
    COUNT(DISTINCT t.creator_id)::bigint
  FROM public.transactions t
  WHERE t.status = 'paid'
    AND t.kind NOT IN ('withdrawal','refund','wallet_topup','wallet_bonus')
    AND t.created_at >= _from
    AND t.created_at < _to;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_financial_summary(timestamptz, timestamptz) TO authenticated;

-- 5) Daily revenue series for admin dashboard
CREATE OR REPLACE FUNCTION public.admin_daily_revenue(_from timestamptz, _to timestamptz)
RETURNS TABLE(day date, gross_cents bigint, platform_fee_cents bigint, tx_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT
    (t.created_at AT TIME ZONE 'UTC')::date AS day,
    COALESCE(SUM(t.amount_cents_gross),0)::bigint,
    COALESCE(SUM(t.platform_fee_cents),0)::bigint,
    COUNT(*)::bigint
  FROM public.transactions t
  WHERE t.status = 'paid'
    AND t.kind NOT IN ('withdrawal','refund','wallet_topup','wallet_bonus')
    AND t.created_at >= _from
    AND t.created_at < _to
  GROUP BY 1
  ORDER BY 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_daily_revenue(timestamptz, timestamptz) TO authenticated;

-- 6) Aggregate wallets snapshot
CREATE OR REPLACE FUNCTION public.admin_wallets_snapshot()
RETURNS TABLE(
  creator_released_cents bigint,
  creator_pending_national_cents bigint,
  creator_pending_international_cents bigint,
  subscriber_balance_cents bigint,
  withdrawals_pending_cents bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE((SELECT SUM(released_cents) FROM public.creator_wallets), 0)::bigint,
    COALESCE((SELECT SUM(pending_national_cents) FROM public.creator_wallets), 0)::bigint,
    COALESCE((SELECT SUM(pending_international_cents) FROM public.creator_wallets), 0)::bigint,
    COALESCE((SELECT SUM(balance_cents) FROM public.subscriber_wallets), 0)::bigint,
    COALESCE((SELECT SUM(amount_cents) FROM public.withdrawals WHERE status IN ('requested','pending')), 0)::bigint;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_wallets_snapshot() TO authenticated;
