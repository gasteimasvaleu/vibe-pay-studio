CREATE TYPE public.user_status_kind AS ENUM ('online','offline','in_chat');

CREATE TABLE public.user_status (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.user_status_kind NOT NULL DEFAULT 'online',
  clear_after_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_status TO authenticated;
GRANT ALL ON public.user_status TO service_role;

ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_status_select_all_authenticated"
  ON public.user_status FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "user_status_insert_own"
  ON public.user_status FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_status_update_own"
  ON public.user_status FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_status_delete_own"
  ON public.user_status FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER user_status_set_updated_at
  BEFORE UPDATE ON public.user_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
