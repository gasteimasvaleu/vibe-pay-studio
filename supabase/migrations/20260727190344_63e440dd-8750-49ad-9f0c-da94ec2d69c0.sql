
-- ============ Admin SELECT / UPDATE policies ============

-- broadcast_jobs
CREATE POLICY "broadcast_jobs admin read" ON public.broadcast_jobs
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "broadcast_jobs admin update" ON public.broadcast_jobs
  FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));

-- trophy_requests
CREATE POLICY "trophy_requests admin read" ON public.trophy_requests
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));

-- subscriptions
CREATE POLICY "subscriptions admin read" ON public.subscriptions
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "subscriptions admin update" ON public.subscriptions
  FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));

-- promotions
CREATE POLICY "promotions admin update" ON public.promotions
  FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));

-- video_calls (already have admin delete; add read + update)
CREATE POLICY "video_calls admin read" ON public.video_calls
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "video_calls admin update" ON public.video_calls
  FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));

-- stories
CREATE POLICY "stories admin read" ON public.stories
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "stories admin delete" ON public.stories
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- live_sessions admin update (encerrar)
CREATE POLICY "live_sessions admin update" ON public.live_sessions
  FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));

-- ============ Indexes ============
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_jobs_status ON public.broadcast_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_calls_status ON public.video_calls(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON public.live_sessions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trophy_requests_status ON public.trophy_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON public.promotions(status, created_at DESC);

-- ============ platform_settings (single row) ============
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  commission_pct_national numeric NOT NULL DEFAULT 15,
  commission_pct_international numeric NOT NULL DEFAULT 20,
  gateway_fee_pct numeric NOT NULL DEFAULT 3.99,
  min_ppv_cents integer NOT NULL DEFAULT 100,
  min_dm_cents integer NOT NULL DEFAULT 100,
  min_videocall_cents integer NOT NULL DEFAULT 3990,
  min_withdrawal_cents integer NOT NULL DEFAULT 5000,
  feature_lives_enabled boolean NOT NULL DEFAULT true,
  feature_broadcasts_enabled boolean NOT NULL DEFAULT true,
  feature_videocalls_enabled boolean NOT NULL DEFAULT true,
  feature_stories_enabled boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_settings authenticated read" ON public.platform_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "platform_settings admin write" ON public.platform_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

INSERT INTO public.platform_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
