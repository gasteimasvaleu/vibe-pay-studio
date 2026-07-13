
-- Profiles: Asaas customer & subaccount
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_wallet_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_account_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_account_status TEXT;

-- payment_intents: enrich for Asaas payments
ALTER TABLE public.payment_intents
  ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS pix_qr_code TEXT,
  ADD COLUMN IF NOT EXISTS pix_copy_paste TEXT,
  ADD COLUMN IF NOT EXISTS method TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS payment_intents_asaas_payment_id_key
  ON public.payment_intents (asaas_payment_id)
  WHERE asaas_payment_id IS NOT NULL;

-- Idempotent webhook events
CREATE TABLE IF NOT EXISTS public.asaas_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.asaas_events TO service_role;

ALTER TABLE public.asaas_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asaas_events admin read"
  ON public.asaas_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update default commission: 20% -> 15%
CREATE OR REPLACE FUNCTION public.apply_transaction_split(_gross_cents bigint, _commission_pct numeric DEFAULT 15.00)
 RETURNS TABLE(platform_fee_cents bigint, net_cents bigint, commission_pct_applied numeric)
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  platform_fee_cents := FLOOR(_gross_cents * _commission_pct / 100.0)::BIGINT;
  net_cents := _gross_cents - platform_fee_cents;
  commission_pct_applied := _commission_pct;
  RETURN NEXT;
END;
$function$;
