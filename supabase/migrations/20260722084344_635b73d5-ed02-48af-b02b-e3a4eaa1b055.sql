ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_split_consistent;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_split_consistent
  CHECK ((platform_fee_cents + COALESCE(gateway_fee_cents, 0) + net_cents) = amount_cents_gross);