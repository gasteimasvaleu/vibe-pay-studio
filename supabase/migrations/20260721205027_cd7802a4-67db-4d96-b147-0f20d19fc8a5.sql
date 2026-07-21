-- 1. Add social handles per creator_profile
ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS tiktok_handle text,
  ADD COLUMN IF NOT EXISTS x_handle text;

-- 2. Idempotent backfill from profiles into creator_profiles
--   PAID row: pulls from profiles.* (display_name, bio, cover_url, socials, price, discounts, chat_welcome, avatar).
--   FREE row: pulls from profiles.free_* + shared account fields where applicable.
UPDATE public.creator_profiles cp
SET
  display_name = COALESCE(cp.display_name, p.display_name),
  avatar_url = COALESCE(cp.avatar_url, p.avatar_url),
  cover_url = COALESCE(cp.cover_url, p.cover_url),
  bio = COALESCE(cp.bio, p.bio),
  price_monthly = COALESCE(cp.price_monthly, p.price_monthly),
  discount_quarterly = GREATEST(cp.discount_quarterly, COALESCE(p.discount_quarterly, 0)),
  discount_semiannual = GREATEST(cp.discount_semiannual, COALESCE(p.discount_semiannual, 0)),
  instagram_handle = COALESCE(cp.instagram_handle, p.instagram_handle),
  tiktok_handle = COALESCE(cp.tiktok_handle, p.tiktok_handle),
  x_handle = COALESCE(cp.x_handle, p.x_handle),
  chat_welcome_enabled = cp.chat_welcome_enabled OR COALESCE(p.chat_welcome_enabled, false),
  chat_welcome_message = COALESCE(cp.chat_welcome_message, p.chat_welcome_message),
  chat_welcome_media = CASE
    WHEN cp.chat_welcome_media IS NULL OR cp.chat_welcome_media = '[]'::jsonb OR cp.chat_welcome_media = '{}'::jsonb
      THEN COALESCE(p.chat_welcome_media, cp.chat_welcome_media)
    ELSE cp.chat_welcome_media
  END,
  chat_welcome_tag = COALESCE(cp.chat_welcome_tag, p.chat_welcome_tag),
  chat_welcome_price_cents = GREATEST(cp.chat_welcome_price_cents, COALESCE(p.chat_welcome_price_cents, 0)),
  updated_at = now()
FROM public.profiles p
WHERE cp.user_id = p.id AND cp.kind = 'paid';

UPDATE public.creator_profiles cp
SET
  display_name = COALESCE(cp.display_name, p.free_display_name, p.display_name),
  avatar_url = COALESCE(cp.avatar_url, p.free_avatar_url),
  updated_at = now()
FROM public.profiles p
WHERE cp.user_id = p.id AND cp.kind = 'free';

-- 3. Free profiles never sell subscriptions -> price must be null
UPDATE public.creator_profiles SET price_monthly = NULL WHERE kind = 'free' AND price_monthly IS NOT NULL;

-- 4. Unique username across creator_profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='creator_profiles_username_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX creator_profiles_username_unique_idx
      ON public.creator_profiles (lower(username));
  END IF;
END $$;

-- 5. Validation trigger: free profiles cannot have a price
CREATE OR REPLACE FUNCTION public.enforce_creator_profile_price_rule()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.kind = 'free' AND NEW.price_monthly IS NOT NULL THEN
    RAISE EXCEPTION 'Perfil gratuito não pode ter preço de assinatura';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_creator_profile_price_rule ON public.creator_profiles;
CREATE TRIGGER trg_enforce_creator_profile_price_rule
BEFORE INSERT OR UPDATE ON public.creator_profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_creator_profile_price_rule();

-- 6. Helper: resolve active creator_profile for a user
CREATE OR REPLACE FUNCTION public.resolve_active_creator_profile(_user_id uuid)
RETURNS public.creator_profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.*
  FROM public.creator_profiles cp
  JOIN public.profiles p ON p.id = cp.user_id
  WHERE cp.user_id = _user_id
    AND (
      cp.id = p.active_profile_id
      OR (p.active_profile_id IS NULL AND cp.kind = 'paid')
    )
  ORDER BY (cp.id = p.active_profile_id) DESC, (cp.kind = 'paid') DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_active_creator_profile(uuid) TO authenticated, service_role;
