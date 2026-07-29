DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.subscription_status'::regtype AND enumlabel = 'past_due') THEN
    ALTER TYPE public.subscription_status ADD VALUE 'past_due';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.subscription_status'::regtype AND enumlabel = 'superseded') THEN
    ALTER TYPE public.subscription_status ADD VALUE 'superseded';
  END IF;
END$$;