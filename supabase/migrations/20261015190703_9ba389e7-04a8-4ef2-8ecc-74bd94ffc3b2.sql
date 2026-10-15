-- =====================================================================
-- As funções de comissão passam a SECURITY INVOKER (sem privilégios elevados).
-- Leitura usada: platform_settings (SELECT público para logados) e profiles
-- (SELECT público). Resultado idêntico, sem bypass de RLS.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.platform_commission_pct(_international boolean DEFAULT false)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN v IS NOT NULL AND v >= 0 AND v <= 90 THEN v
    ELSE CASE WHEN COALESCE(_international, false) THEN 20.00 ELSE 15.00 END
  END
  FROM (
    SELECT (
      SELECT CASE
               WHEN COALESCE(_international, false) THEN commission_pct_international
               ELSE commission_pct_national
             END
      FROM public.platform_settings
      WHERE id = true
      LIMIT 1
    ) AS v
  ) s;
$function$;

CREATE OR REPLACE FUNCTION public.buyer_country_code(_buyer uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT NULLIF(btrim(upper(country)), '') FROM public.profiles WHERE user_id = _buyer LIMIT 1),
    'BR'
  );
$function$;

CREATE OR REPLACE FUNCTION public.buyer_is_international(_buyer uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT public.buyer_country_code(_buyer) NOT IN ('BR', 'BRA', 'BRAZIL');
$function$;

CREATE OR REPLACE FUNCTION public.apply_transaction_split(
  _gross_cents bigint,
  _commission_pct numeric DEFAULT NULL
)
RETURNS TABLE(platform_fee_cents bigint, net_cents bigint, commission_pct_applied numeric)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  _commission_pct := COALESCE(_commission_pct, public.platform_commission_pct(false));
  platform_fee_cents := FLOOR(_gross_cents * _commission_pct / 100.0)::BIGINT;
  net_cents := _gross_cents - platform_fee_cents;
  commission_pct_applied := _commission_pct;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_transaction_split(
  _gross_cents bigint,
  _commission_pct numeric DEFAULT NULL,
  _method payment_method DEFAULT 'manual'::payment_method
)
RETURNS TABLE(platform_fee_cents bigint, gateway_fee_cents bigint, net_cents bigint, commission_pct_applied numeric)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  _commission_pct := COALESCE(_commission_pct, public.platform_commission_pct(false));
  platform_fee_cents := FLOOR(_gross_cents * _commission_pct / 100.0)::BIGINT;
  gateway_fee_cents  := public.calc_gateway_fee_cents(_gross_cents, _method);
  net_cents          := GREATEST(_gross_cents - platform_fee_cents - gateway_fee_cents, 0);
  commission_pct_applied := _commission_pct;
  RETURN NEXT;
END;
$function$;

-- Mantém o acesso restrito a quem usa o app e aos serviços internos.
REVOKE ALL ON FUNCTION public.platform_commission_pct(boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.buyer_country_code(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.buyer_is_international(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_transaction_split(bigint, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_transaction_split(bigint, numeric, payment_method) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.platform_commission_pct(boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.buyer_country_code(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.buyer_is_international(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_transaction_split(bigint, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_transaction_split(bigint, numeric, payment_method) TO authenticated, service_role;