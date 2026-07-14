CREATE TABLE public.saved_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asaas_customer_id TEXT NOT NULL,
  asaas_card_token TEXT NOT NULL,
  brand TEXT,
  last4 TEXT NOT NULL,
  holder_name TEXT NOT NULL,
  exp_month TEXT NOT NULL,
  exp_year TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saved_cards_user_id_idx ON public.saved_cards(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_cards TO authenticated;
GRANT ALL ON public.saved_cards TO service_role;

ALTER TABLE public.saved_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved cards"
  ON public.saved_cards FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved cards"
  ON public.saved_cards FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved cards"
  ON public.saved_cards FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER set_saved_cards_updated_at
  BEFORE UPDATE ON public.saved_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();