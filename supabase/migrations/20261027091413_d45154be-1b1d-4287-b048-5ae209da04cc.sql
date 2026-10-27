DROP POLICY IF EXISTS profiles_public_read ON public.profiles;
CREATE POLICY profiles_owner_read ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY profiles_admin_read ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE VIEW public.profiles_public AS
SELECT id, user_id, username, account_type, created_at, updated_at,
  instagram_handle, tiktok_handle, x_handle,
  price_monthly, discount_quarterly, discount_semiannual,
  onboarding_completed_at,
  video_call_enabled, video_call_price_cents, video_call_default_minutes,
  display_name, bio, avatar_url, cover_url, location,
  restrict_search, restrict_search_br, restrict_search_country, show_followers,
  restrict_mentions, restrict_friendships,
  free_profile_enabled, active_view, free_display_name, free_avatar_url, free_username,
  active_profile_id, country,
  paid_dm_upload_enabled, paid_dm_upload_min_cents, paid_dm_upload_max_cents,
  last_seen_at,
  (kyc_status = 'verified') AS is_verified
FROM public.profiles
WHERE banned_at IS NULL OR public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id;
GRANT SELECT ON public.profiles_public TO anon, authenticated;
GRANT ALL ON public.profiles_public TO service_role;

CREATE OR REPLACE VIEW public.creator_profiles_search AS
SELECT cp.id, cp.user_id, cp.username, cp.display_name, cp.avatar_url, cp.cover_url, cp.created_at,
  CASE WHEN p.is_verified THEN coalesce(cp.verified_at, cp.created_at) END AS kyc_verified_at,
  p.country, p.restrict_search, p.restrict_search_br, p.restrict_search_country, p.restrict_mentions,
  cp.verified_at
FROM public.creator_profiles cp JOIN public.profiles_public p ON p.user_id = cp.user_id;
ALTER VIEW public.creator_profiles_search SET (security_invoker = on);

DROP POLICY IF EXISTS "Read public or own friendships" ON public.friendships;
CREATE POLICY "Read public or own friendships" ON public.friendships FOR SELECT USING (
  owner_id = auth.uid() OR friend_id = auth.uid() OR (visible = true AND NOT EXISTS (
    SELECT 1 FROM public.profiles_public p WHERE p.user_id = friendships.friend_id AND p.restrict_friendships = true)));

ALTER FUNCTION public.fill_active_creator_profile_id() SECURITY DEFINER;
ALTER FUNCTION public.fill_active_creator_profile_id() SET search_path = public;
ALTER FUNCTION public.buyer_country_code(uuid) SECURITY DEFINER;
ALTER FUNCTION public.buyer_country_code(uuid) SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_privileged_writer() RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r text;
BEGIN
  r := nullif(current_setting('request.jwt.claims', true), '')::json->>'role';
  IF r = 'service_role' THEN RETURN true; END IF;
  IF session_user NOT IN ('authenticator','anon','authenticated') AND r IS NULL THEN RETURN true; END IF;
  IF r IS NULL THEN RETURN true; END IF; -- sem JWT: chamadas internas (auth/cron)
  RETURN auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin');
END $$;

CREATE OR REPLACE FUNCTION public.profiles_protect_columns() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_privileged_writer() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.kyc_status IS DISTINCT FROM 'not_started' OR NEW.kyc_verified_at IS NOT NULL
      OR NEW.banned_at IS NOT NULL OR NEW.account_type IS DISTINCT FROM 'subscriber'
      OR NEW.cpf IS NOT NULL OR NEW.country IS NOT NULL OR NEW.referred_by IS NOT NULL
      OR NEW.asaas_customer_id IS NOT NULL OR NEW.asaas_wallet_id IS NOT NULL
      OR NEW.asaas_account_id IS NOT NULL OR NEW.asaas_api_key_encrypted IS NOT NULL
      OR NEW.veriff_session_id IS NOT NULL THEN
      RAISE EXCEPTION 'protected_profile_fields' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status OR NEW.kyc_verified_at IS DISTINCT FROM OLD.kyc_verified_at
      OR NEW.banned_at IS DISTINCT FROM OLD.banned_at OR NEW.account_type IS DISTINCT FROM OLD.account_type
      OR NEW.cpf IS DISTINCT FROM OLD.cpf OR NEW.country IS DISTINCT FROM OLD.country
      OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
      OR NEW.asaas_customer_id IS DISTINCT FROM OLD.asaas_customer_id
      OR NEW.asaas_wallet_id IS DISTINCT FROM OLD.asaas_wallet_id
      OR NEW.asaas_account_id IS DISTINCT FROM OLD.asaas_account_id
      OR NEW.asaas_api_key_encrypted IS DISTINCT FROM OLD.asaas_api_key_encrypted
      OR NEW.veriff_session_id IS DISTINCT FROM OLD.veriff_session_id THEN
      RAISE EXCEPTION 'protected_profile_fields' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_profiles_protect_columns ON public.profiles;
CREATE TRIGGER trg_profiles_protect_columns BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_protect_columns();

CREATE OR REPLACE FUNCTION public.creator_profiles_protect_columns() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_privileged_writer() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.verified_at IS NOT NULL OR coalesce(NEW.kyc_status,'not_started') NOT IN ('not_started','pending') THEN
      RAISE EXCEPTION 'protected_creator_fields' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.verified_at IS DISTINCT FROM OLD.verified_at OR NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    RAISE EXCEPTION 'protected_creator_fields' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_creator_profiles_protect_columns ON public.creator_profiles;
CREATE TRIGGER trg_creator_profiles_protect_columns BEFORE INSERT OR UPDATE ON public.creator_profiles
FOR EACH ROW EXECUTE FUNCTION public.creator_profiles_protect_columns();