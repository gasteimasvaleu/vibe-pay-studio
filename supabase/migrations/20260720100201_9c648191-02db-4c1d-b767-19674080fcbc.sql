
-- 1. Tabela creator_profiles
CREATE TABLE public.creator_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('paid','free')),
  username text NOT NULL,
  display_name text,
  avatar_url text,
  cover_url text,
  bio text,
  price_monthly numeric,
  discount_quarterly integer NOT NULL DEFAULT 0,
  discount_semiannual integer NOT NULL DEFAULT 0,
  kyc_status text NOT NULL DEFAULT 'pending',
  chat_welcome_enabled boolean NOT NULL DEFAULT false,
  chat_welcome_message text,
  chat_welcome_media jsonb NOT NULL DEFAULT '[]'::jsonb,
  chat_welcome_tag text,
  chat_welcome_price_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX creator_profiles_user_kind_uidx ON public.creator_profiles (user_id, kind);
CREATE UNIQUE INDEX creator_profiles_username_uidx ON public.creator_profiles (lower(username));
CREATE INDEX creator_profiles_user_idx ON public.creator_profiles (user_id);

GRANT SELECT ON public.creator_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_profiles TO authenticated;
GRANT ALL ON public.creator_profiles TO service_role;

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can view creator profiles"
  ON public.creator_profiles FOR SELECT
  USING (true);

CREATE POLICY "owner can insert own creator profile"
  ON public.creator_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner can update own creator profile"
  ON public.creator_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner can delete own creator profile"
  ON public.creator_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER creator_profiles_set_updated_at
  BEFORE UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. active_profile_id em profiles
ALTER TABLE public.profiles
  ADD COLUMN active_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE SET NULL;

CREATE INDEX profiles_active_profile_idx ON public.profiles (active_profile_id);

-- 3. Backfill: perfil "paid" para toda conta creator (paga).
INSERT INTO public.creator_profiles (
  user_id, kind, username, display_name, avatar_url, cover_url, bio,
  price_monthly, discount_quarterly, discount_semiannual, kyc_status,
  chat_welcome_enabled, chat_welcome_message, chat_welcome_media,
  chat_welcome_tag, chat_welcome_price_cents, created_at, updated_at
)
SELECT
  p.user_id, 'paid', p.username, p.display_name, p.avatar_url, p.cover_url, p.bio,
  p.price_monthly, p.discount_quarterly, p.discount_semiannual, p.kyc_status,
  p.chat_welcome_enabled, p.chat_welcome_message, p.chat_welcome_media,
  p.chat_welcome_tag, p.chat_welcome_price_cents, p.created_at, p.updated_at
FROM public.profiles p
WHERE p.account_type = 'creator'
ON CONFLICT (user_id, kind) DO NOTHING;

-- 4. Backfill: perfil "free" para (a) contas free_creator e (b) creators com free_profile_enabled.
INSERT INTO public.creator_profiles (
  user_id, kind, username, display_name, avatar_url, cover_url, bio, kyc_status
)
SELECT
  p.user_id, 'free',
  COALESCE(p.free_username, p.username || '_free'),
  COALESCE(p.free_display_name, p.display_name),
  COALESCE(p.free_avatar_url, p.avatar_url),
  p.cover_url, p.bio, p.kyc_status
FROM public.profiles p
WHERE p.account_type = 'free_creator'
   OR (p.account_type = 'creator' AND p.free_profile_enabled = true)
ON CONFLICT (user_id, kind) DO NOTHING;

-- 5. Setar active_profile_id conforme o active_view atual.
UPDATE public.profiles p
SET active_profile_id = cp.id
FROM public.creator_profiles cp
WHERE cp.user_id = p.user_id
  AND cp.kind = CASE
    WHEN p.account_type = 'creator' AND p.active_view = 'free' THEN 'free'
    WHEN p.account_type = 'free_creator' THEN 'free'
    ELSE 'paid'
  END;
