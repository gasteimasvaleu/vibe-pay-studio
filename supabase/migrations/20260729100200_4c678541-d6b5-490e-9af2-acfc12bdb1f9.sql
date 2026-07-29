UPDATE public.story_unlocks SET status='paid', provider_ref='pay_0suro09hl3fkuxz2' WHERE id='26e776a4-f38a-4934-969f-436b298ebd43' AND status='pending';

UPDATE public.payment_intents SET processed_at=now(), event_type='PAYMENT_RECEIVED' WHERE asaas_payment_id='pay_0suro09hl3fkuxz2' AND processed_at IS NULL;

UPDATE public.payment_intents SET processed_at=now(), event_type='SUPERSEDED' WHERE asaas_payment_id IN ('pay_eidw8wltek7sdbbn','pay_7y1d0y30m6g9enjp') AND processed_at IS NULL;

UPDATE public.asaas_events SET processed_at=now() WHERE event_id='evt_d26e303b238e509335ac9ba210e51b0f&1439735461' AND processed_at IS NULL;