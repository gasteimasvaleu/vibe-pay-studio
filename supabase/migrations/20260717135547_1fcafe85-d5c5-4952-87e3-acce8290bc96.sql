CREATE OR REPLACE FUNCTION public.admin_wallets_snapshot()
 RETURNS TABLE(creator_released_cents bigint, creator_pending_national_cents bigint, creator_pending_international_cents bigint, subscriber_balance_cents bigint, withdrawals_pending_cents bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    COALESCE((SELECT SUM(amount_cents) FROM public.withdrawals WHERE status IN ('requested','in_review')), 0)::bigint;
END;
$function$;