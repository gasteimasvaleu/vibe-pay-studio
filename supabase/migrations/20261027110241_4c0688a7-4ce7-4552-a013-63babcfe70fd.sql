ALTER TABLE public.payment_intents ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;
REVOKE EXECUTE ON FUNCTION public.release_matured_earnings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_matured_earnings() TO service_role;