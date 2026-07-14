
-- 1) Visualizações de publicações
CREATE TABLE IF NOT EXISTS public.publication_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  publication_id UUID NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  viewer_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS publication_views_pub_created_idx
  ON public.publication_views (publication_id, created_at DESC);
CREATE INDEX IF NOT EXISTS publication_views_viewer_idx
  ON public.publication_views (viewer_id, publication_id, created_at DESC);

GRANT SELECT, INSERT ON public.publication_views TO authenticated;
GRANT INSERT ON public.publication_views TO anon;
GRANT ALL ON public.publication_views TO service_role;

ALTER TABLE public.publication_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a view"
  ON public.publication_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    viewer_id IS NULL OR viewer_id = auth.uid()
  );

CREATE POLICY "Author sees their publication views"
  ON public.publication_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.publications p
      WHERE p.id = publication_views.publication_id
        AND p.author_id = auth.uid()
    )
  );

-- 2) Visualizações de perfis
CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  viewer_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profile_views_profile_created_idx
  ON public.profile_views (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS profile_views_viewer_idx
  ON public.profile_views (viewer_id, profile_id, created_at DESC);

GRANT SELECT, INSERT ON public.profile_views TO authenticated;
GRANT INSERT ON public.profile_views TO anon;
GRANT ALL ON public.profile_views TO service_role;

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a profile view"
  ON public.profile_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    viewer_id IS NULL OR viewer_id = auth.uid()
  );

CREATE POLICY "Owner sees their profile views"
  ON public.profile_views FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- 3) Sessões de live
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  title TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  viewers_peak INTEGER NOT NULL DEFAULT 0,
  total_views INTEGER NOT NULL DEFAULT 0,
  gross_cents BIGINT NOT NULL DEFAULT 0,
  tips_cents BIGINT NOT NULL DEFAULT 0,
  cover_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS live_sessions_creator_started_idx
  ON public.live_sessions (creator_id, started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_sessions TO authenticated;
GRANT SELECT ON public.live_sessions TO anon;
GRANT ALL ON public.live_sessions TO service_role;

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can see lives"
  ON public.live_sessions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Creator manages own lives"
  ON public.live_sessions FOR ALL
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE TRIGGER live_sessions_set_updated_at
  BEFORE UPDATE ON public.live_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Sequência (streak) de atividade do criador
CREATE TABLE IF NOT EXISTS public.creator_streak_days (
  creator_id UUID NOT NULL,
  day DATE NOT NULL,
  publications_count INTEGER NOT NULL DEFAULT 0,
  live_minutes INTEGER NOT NULL DEFAULT 0,
  chat_replies INTEGER NOT NULL DEFAULT 0,
  revenue_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (creator_id, day)
);
CREATE INDEX IF NOT EXISTS creator_streak_days_creator_day_idx
  ON public.creator_streak_days (creator_id, day DESC);

GRANT SELECT ON public.creator_streak_days TO authenticated;
GRANT ALL ON public.creator_streak_days TO service_role;

ALTER TABLE public.creator_streak_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator sees own streak"
  ON public.creator_streak_days FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

CREATE TRIGGER creator_streak_days_set_updated_at
  BEFORE UPDATE ON public.creator_streak_days
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: incrementa publications_count quando um post é criado
CREATE OR REPLACE FUNCTION public.bump_streak_on_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.creator_streak_days (creator_id, day, publications_count)
  VALUES (NEW.author_id, (COALESCE(NEW.published_at, NEW.created_at, now()))::date, 1)
  ON CONFLICT (creator_id, day) DO UPDATE
    SET publications_count = public.creator_streak_days.publications_count + 1,
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS publications_bump_streak ON public.publications;
CREATE TRIGGER publications_bump_streak
  AFTER INSERT ON public.publications
  FOR EACH ROW EXECUTE FUNCTION public.bump_streak_on_publication();

-- Trigger: incrementa revenue_cents quando transaction vira paid
CREATE OR REPLACE FUNCTION public.bump_streak_on_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid'
     AND NEW.creator_id IS NOT NULL
     AND NEW.net_cents > 0
     AND NEW.kind NOT IN ('withdrawal','refund','wallet_topup','wallet_bonus')
     AND (TG_OP = 'INSERT' OR OLD.status <> 'paid') THEN
    INSERT INTO public.creator_streak_days (creator_id, day, revenue_cents)
    VALUES (NEW.creator_id, NEW.created_at::date, NEW.net_cents)
    ON CONFLICT (creator_id, day) DO UPDATE
      SET revenue_cents = public.creator_streak_days.revenue_cents + NEW.net_cents,
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_bump_streak ON public.transactions;
CREATE TRIGGER transactions_bump_streak
  AFTER INSERT OR UPDATE OF status ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.bump_streak_on_transaction();

-- 5) País da transação (para Top 5 países)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS country_code CHAR(2);
CREATE INDEX IF NOT EXISTS transactions_country_idx
  ON public.transactions (creator_id, country_code)
  WHERE country_code IS NOT NULL;
