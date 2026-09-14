CREATE OR REPLACE FUNCTION public.withdrawals_fill_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.creator_profile_id IS NULL THEN
    SELECT COALESCE(
      (SELECT cp.id FROM public.creator_profiles cp
         JOIN public.profiles p ON p.active_profile_id = cp.id
        WHERE p.user_id = NEW.creator_id AND cp.user_id = NEW.creator_id
        LIMIT 1),
      (SELECT cp.id FROM public.creator_profiles cp
        WHERE cp.user_id = NEW.creator_id AND cp.kind = 'paid'
        ORDER BY cp.created_at LIMIT 1),
      (SELECT cp.id FROM public.creator_profiles cp
        WHERE cp.user_id = NEW.creator_id
        ORDER BY cp.created_at LIMIT 1)
    ) INTO NEW.creator_profile_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawals_fill_profile ON public.withdrawals;
CREATE TRIGGER trg_withdrawals_fill_profile
BEFORE INSERT ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.withdrawals_fill_profile();