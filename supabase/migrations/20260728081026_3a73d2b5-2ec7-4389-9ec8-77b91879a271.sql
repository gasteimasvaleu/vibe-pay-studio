ALTER TABLE public.subscriptions
  ALTER COLUMN auto_renew SET DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;