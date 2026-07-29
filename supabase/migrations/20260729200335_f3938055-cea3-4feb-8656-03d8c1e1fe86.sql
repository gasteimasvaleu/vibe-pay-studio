ALTER TABLE public.saved_cards ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS saved_cards_user_active_idx ON public.saved_cards(user_id) WHERE deleted_at IS NULL;