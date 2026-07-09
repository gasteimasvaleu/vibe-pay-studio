
DO $$ BEGIN
  CREATE TYPE public.promotion_status AS ENUM ('active', 'paused', 'ended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  max_subscriptions integer NOT NULL CHECK (max_subscriptions >= 10),
  duration_days integer NOT NULL CHECK (duration_days BETWEEN 1 AND 7),
  discount_pct integer NOT NULL CHECK (discount_pct BETWEEN 5 AND 60),
  monthly_price_snapshot numeric(10,2) NOT NULL CHECK (monthly_price_snapshot >= 0),
  promo_price numeric(10,2) NOT NULL CHECK (promo_price >= 0),
  description text NOT NULL DEFAULT '',
  status public.promotion_status NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  subscriptions_used integer NOT NULL DEFAULT 0 CHECK (subscriptions_used >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators manage own promotions"
  ON public.promotions
  FOR ALL
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Authenticated can view active promotions"
  ON public.promotions
  FOR SELECT
  TO authenticated
  USING (status = 'active' AND now() BETWEEN starts_at AND ends_at);

CREATE INDEX promotions_creator_id_idx ON public.promotions(creator_id);
CREATE INDEX promotions_status_idx ON public.promotions(status);

CREATE TRIGGER promotions_set_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
