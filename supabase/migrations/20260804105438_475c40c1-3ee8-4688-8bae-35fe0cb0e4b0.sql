ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS feed_welcome_seen_at timestamptz;

COMMENT ON COLUMN public.profiles.feed_welcome_seen_at IS 'Quando o usuário dispensou a tela de boas-vindas do feed pela primeira vez.';
