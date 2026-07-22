ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS cleared_at_a timestamptz,
  ADD COLUMN IF NOT EXISTS cleared_at_b timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at_a timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at_b timestamptz;