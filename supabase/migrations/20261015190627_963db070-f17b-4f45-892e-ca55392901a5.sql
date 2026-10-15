-- Fechar acesso público às funções de comissão (SECURITY DEFINER).
-- Só usuários logados e os serviços internos devem poder chamá-las.

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