
-- Add privacy flags to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS restrict_search boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS restrict_search_br boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS restrict_search_country boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_followers boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS restrict_mentions boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS restrict_friendships boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emails_enabled boolean NOT NULL DEFAULT true;

-- Email preferences table (opted-in = true)
CREATE TABLE IF NOT EXISTS public.email_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  free_to_paid boolean NOT NULL DEFAULT true,
  post_sales boolean NOT NULL DEFAULT true,
  subscription_sales boolean NOT NULL DEFAULT true,
  content_purchase boolean NOT NULL DEFAULT true,
  creator_referrals boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.email_preferences TO authenticated;
GRANT ALL ON public.email_preferences TO service_role;

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_prefs_select_own" ON public.email_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "email_prefs_insert_own" ON public.email_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "email_prefs_update_own" ON public.email_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_email_prefs_updated_at
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- can_send_email: master switch + per-kind pref
CREATE OR REPLACE FUNCTION public.can_send_email(_user_id uuid, _kind text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _enabled boolean;
  _allowed boolean;
BEGIN
  SELECT emails_enabled INTO _enabled FROM public.profiles WHERE user_id = _user_id;
  IF _enabled IS NULL OR _enabled = false THEN
    RETURN false;
  END IF;

  SELECT CASE _kind
    WHEN 'free_to_paid' THEN free_to_paid
    WHEN 'post_sales' THEN post_sales
    WHEN 'subscription_sales' THEN subscription_sales
    WHEN 'content_purchase' THEN content_purchase
    WHEN 'creator_referrals' THEN creator_referrals
    ELSE true
  END INTO _allowed
  FROM public.email_preferences WHERE user_id = _user_id;

  -- Missing row = all opted-in
  RETURN COALESCE(_allowed, true);
END;
$$;

REVOKE ALL ON FUNCTION public.can_send_email(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_send_email(uuid, text) TO authenticated, service_role;
