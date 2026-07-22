-- Extend broadcast_jobs for scheduling + cancellation
ALTER TABLE public.broadcast_jobs
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ NULL;

-- Widen status enum via check constraint
ALTER TABLE public.broadcast_jobs DROP CONSTRAINT IF EXISTS broadcast_jobs_status_check;
ALTER TABLE public.broadcast_jobs
  ADD CONSTRAINT broadcast_jobs_status_check
  CHECK (status IN ('scheduled','running','completed','failed','cancelled'));

-- Default status remains 'completed' for legacy inserts; new scheduled inserts pass 'scheduled'.

-- Dispatcher index (partial for pending scheduled jobs)
CREATE INDEX IF NOT EXISTS broadcast_jobs_pending_idx
  ON public.broadcast_jobs (scheduled_at)
  WHERE status = 'scheduled';

-- Extra index for calendar per-month lookups
CREATE INDEX IF NOT EXISTS broadcast_jobs_creator_scheduled_idx
  ON public.broadcast_jobs (creator_id, scheduled_at)
  WHERE scheduled_at IS NOT NULL;

-- Dispatcher will run inside a server route with service role, bypassing RLS.
