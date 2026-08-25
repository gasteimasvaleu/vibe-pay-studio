-- 1) Backfill: creator_profiles (perfil pago) é a fonte de verdade
UPDATE public.profiles p
SET price_monthly = cp.price_monthly,
    discount_quarterly = COALESCE(cp.discount_quarterly, 0),
    discount_semiannual = COALESCE(cp.discount_semiannual, 0)
FROM public.creator_profiles cp
WHERE cp.user_id = p.user_id
  AND cp.kind = 'paid'
  AND cp.price_monthly IS NOT NULL
  AND (p.price_monthly IS DISTINCT FROM cp.price_monthly
       OR COALESCE(p.discount_quarterly,0) IS DISTINCT FROM COALESCE(cp.discount_quarterly,0)
       OR COALESCE(p.discount_semiannual,0) IS DISTINCT FROM COALESCE(cp.discount_semiannual,0));

-- 2) profiles -> creator_profiles (perfil pago)
CREATE OR REPLACE FUNCTION public.sync_pricing_profile_to_creator_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.price_monthly IS DISTINCT FROM OLD.price_monthly
     OR COALESCE(NEW.discount_quarterly,0) IS DISTINCT FROM COALESCE(OLD.discount_quarterly,0)
     OR COALESCE(NEW.discount_semiannual,0) IS DISTINCT FROM COALESCE(OLD.discount_semiannual,0)
  THEN
    UPDATE public.creator_profiles cp
       SET price_monthly = NEW.price_monthly,
           discount_quarterly = COALESCE(NEW.discount_quarterly,0),
           discount_semiannual = COALESCE(NEW.discount_semiannual,0)
     WHERE cp.user_id = NEW.user_id
       AND cp.kind = 'paid'
       AND (cp.price_monthly IS DISTINCT FROM NEW.price_monthly
            OR COALESCE(cp.discount_quarterly,0) IS DISTINCT FROM COALESCE(NEW.discount_quarterly,0)
            OR COALESCE(cp.discount_semiannual,0) IS DISTINCT FROM COALESCE(NEW.discount_semiannual,0));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pricing_profile ON public.profiles;
CREATE TRIGGER trg_sync_pricing_profile
AFTER UPDATE OF price_monthly, discount_quarterly, discount_semiannual ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_pricing_profile_to_creator_profile();

-- 3) creator_profiles (perfil pago) -> profiles
CREATE OR REPLACE FUNCTION public.sync_pricing_creator_profile_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.kind <> 'paid' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND NEW.price_monthly IS NOT DISTINCT FROM OLD.price_monthly
     AND COALESCE(NEW.discount_quarterly,0) IS NOT DISTINCT FROM COALESCE(OLD.discount_quarterly,0)
     AND COALESCE(NEW.discount_semiannual,0) IS NOT DISTINCT FROM COALESCE(OLD.discount_semiannual,0)
  THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles p
     SET price_monthly = NEW.price_monthly,
         discount_quarterly = COALESCE(NEW.discount_quarterly,0),
         discount_semiannual = COALESCE(NEW.discount_semiannual,0)
   WHERE p.user_id = NEW.user_id
     AND (p.price_monthly IS DISTINCT FROM NEW.price_monthly
          OR COALESCE(p.discount_quarterly,0) IS DISTINCT FROM COALESCE(NEW.discount_quarterly,0)
          OR COALESCE(p.discount_semiannual,0) IS DISTINCT FROM COALESCE(NEW.discount_semiannual,0));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pricing_creator_profile ON public.creator_profiles;
CREATE TRIGGER trg_sync_pricing_creator_profile
AFTER INSERT OR UPDATE OF price_monthly, discount_quarterly, discount_semiannual ON public.creator_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_pricing_creator_profile_to_profile();