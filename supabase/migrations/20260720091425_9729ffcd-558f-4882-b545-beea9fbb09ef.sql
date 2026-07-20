ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_profile_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active_view text NOT NULL DEFAULT 'creator',
  ADD COLUMN IF NOT EXISTS free_display_name text,
  ADD COLUMN IF NOT EXISTS free_avatar_url text;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_active_view_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_active_view_check CHECK (active_view IN ('creator','free'));