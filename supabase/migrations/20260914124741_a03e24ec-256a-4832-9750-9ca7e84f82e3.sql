CREATE TABLE public.transaction_hides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, transaction_id)
);

GRANT SELECT, INSERT, DELETE ON public.transaction_hides TO authenticated;
GRANT ALL ON public.transaction_hides TO service_role;

ALTER TABLE public.transaction_hides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transaction_hides_select_own" ON public.transaction_hides
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "transaction_hides_insert_own" ON public.transaction_hides
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transaction_hides_delete_own" ON public.transaction_hides
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_transaction_hides_user ON public.transaction_hides(user_id);

CREATE TABLE public.withdrawal_hides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  withdrawal_id uuid NOT NULL REFERENCES public.withdrawals(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, withdrawal_id)
);

GRANT SELECT, INSERT, DELETE ON public.withdrawal_hides TO authenticated;
GRANT ALL ON public.withdrawal_hides TO service_role;

ALTER TABLE public.withdrawal_hides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "withdrawal_hides_select_own" ON public.withdrawal_hides
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "withdrawal_hides_insert_own" ON public.withdrawal_hides
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "withdrawal_hides_delete_own" ON public.withdrawal_hides
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_withdrawal_hides_user ON public.withdrawal_hides(user_id);