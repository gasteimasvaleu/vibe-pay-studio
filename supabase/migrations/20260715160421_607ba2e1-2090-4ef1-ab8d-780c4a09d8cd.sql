
-- Index for promotion lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_promotion_id
  ON public.subscriptions(promotion_id)
  WHERE promotion_id IS NOT NULL;

-- Trigger function: increment promotions.subscriptions_used and auto-end when full
CREATE OR REPLACE FUNCTION public.promotions_bump_on_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_used INT;
  _max INT;
BEGIN
  IF NEW.promotion_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only count the transition into "active"
  IF NOT (
    (TG_OP = 'INSERT' AND NEW.status = 'active') OR
    (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'active' AND NEW.status = 'active')
  ) THEN
    RETURN NEW;
  END IF;

  UPDATE public.promotions
     SET subscriptions_used = subscriptions_used + 1,
         updated_at = now()
   WHERE id = NEW.promotion_id
  RETURNING subscriptions_used, max_subscriptions INTO _new_used, _max;

  IF _new_used IS NOT NULL AND _max IS NOT NULL AND _new_used >= _max THEN
    UPDATE public.promotions
       SET status = 'ended', updated_at = now()
     WHERE id = NEW.promotion_id
       AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promotions_bump_on_subscription ON public.subscriptions;
CREATE TRIGGER trg_promotions_bump_on_subscription
AFTER INSERT OR UPDATE OF status ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.promotions_bump_on_subscription();

-- Auto-end expired promotions every 15 minutes
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'promotions-auto-end') THEN
    PERFORM cron.unschedule('promotions-auto-end');
  END IF;
END $$;

SELECT cron.schedule(
  'promotions-auto-end',
  '*/15 * * * *',
  $$
  UPDATE public.promotions
     SET status = 'ended', updated_at = now()
   WHERE status = 'active'
     AND ends_at <= now();
  $$
);
