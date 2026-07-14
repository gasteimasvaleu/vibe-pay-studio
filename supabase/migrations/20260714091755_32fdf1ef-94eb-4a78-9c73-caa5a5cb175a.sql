UPDATE public.publication_unlocks
SET status = 'paid'
WHERE id = '2c3ea175-d692-4953-9dcf-12ab67a02fcd'
  AND status = 'pending';

UPDATE public.payment_intents
SET processed_at = now(), event_type = 'MANUAL_BACKFILL'
WHERE asaas_payment_id IN ('pay_acadt48b27fdljlz', 'pay_dz7rb3olsib1ogww')
  AND processed_at IS NULL;