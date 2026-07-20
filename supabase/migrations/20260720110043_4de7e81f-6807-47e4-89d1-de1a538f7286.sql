-- 1) Destravar conta sexandoapp@hotmail.com e criar creator_profile faltante
DO $$
DECLARE
  _uid uuid := '5f1467fb-4149-41a4-baea-9b7347444990';
  _cp_id uuid;
  _p record;
BEGIN
  SELECT username, display_name, avatar_url, cover_url, bio, price_monthly,
         discount_quarterly, discount_semiannual
    INTO _p
    FROM public.profiles WHERE user_id = _uid;

  SELECT id INTO _cp_id FROM public.creator_profiles
    WHERE user_id = _uid AND kind = 'paid' LIMIT 1;

  IF _cp_id IS NULL THEN
    INSERT INTO public.creator_profiles
      (user_id, kind, username, display_name, avatar_url, cover_url, bio,
       price_monthly, discount_quarterly, discount_semiannual, kyc_status)
    VALUES
      (_uid, 'paid', _p.username, _p.display_name, _p.avatar_url, _p.cover_url,
       _p.bio, _p.price_monthly, COALESCE(_p.discount_quarterly,0),
       COALESCE(_p.discount_semiannual,0), 'verified')
    RETURNING id INTO _cp_id;
  END IF;

  UPDATE public.profiles
    SET kyc_status = 'verified',
        kyc_verified_at = COALESCE(kyc_verified_at, now()),
        account_type = 'creator',
        onboarding_completed_at = COALESCE(onboarding_completed_at, now()),
        active_profile_id = COALESCE(active_profile_id, _cp_id),
        active_view = 'creator'
    WHERE user_id = _uid;
END $$;

-- 2) Trigger: quando profiles.account_type vira 'creator' (ou kyc_status vira 'verified'
--    para um creator), garantir que exista o creator_profiles(kind='paid') e setar active_profile_id.
CREATE OR REPLACE FUNCTION public.ensure_paid_creator_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cp_id uuid;
BEGIN
  IF NEW.account_type <> 'creator' THEN
    RETURN NEW;
  END IF;
  -- Só age em transições relevantes
  IF TG_OP = 'UPDATE'
     AND OLD.account_type = NEW.account_type
     AND COALESCE(OLD.kyc_status,'') = COALESCE(NEW.kyc_status,'') THEN
    RETURN NEW;
  END IF;

  SELECT id INTO _cp_id
    FROM public.creator_profiles
    WHERE user_id = NEW.user_id AND kind = 'paid'
    LIMIT 1;

  IF _cp_id IS NULL THEN
    INSERT INTO public.creator_profiles
      (user_id, kind, username, display_name, avatar_url, cover_url, bio,
       price_monthly, discount_quarterly, discount_semiannual, kyc_status)
    VALUES
      (NEW.user_id, 'paid', NEW.username, NEW.display_name, NEW.avatar_url,
       NEW.cover_url, NEW.bio, NEW.price_monthly,
       COALESCE(NEW.discount_quarterly, 0),
       COALESCE(NEW.discount_semiannual, 0),
       COALESCE(NEW.kyc_status, 'pending'))
    RETURNING id INTO _cp_id;
  END IF;

  IF NEW.active_profile_id IS NULL THEN
    NEW.active_profile_id := _cp_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_paid_creator_profile ON public.profiles;
CREATE TRIGGER trg_ensure_paid_creator_profile
  BEFORE INSERT OR UPDATE OF account_type, kyc_status ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_paid_creator_profile();