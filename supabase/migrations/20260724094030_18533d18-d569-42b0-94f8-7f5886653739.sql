
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text,
  ADD COLUMN IF NOT EXISTS next_charge_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_payment_id text;

CREATE INDEX IF NOT EXISTS subscriptions_asaas_subscription_id_idx
  ON public.subscriptions(asaas_subscription_id);

ALTER TYPE public.email_kind ADD VALUE IF NOT EXISTS 'pix_invoice';
