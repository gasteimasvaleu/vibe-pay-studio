ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "sender updates own message" ON public.chat_messages;
CREATE POLICY "sender updates own message" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.chat_message_hides (
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.chat_message_hides TO authenticated;
GRANT ALL ON public.chat_message_hides TO service_role;
ALTER TABLE public.chat_message_hides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own hides read" ON public.chat_message_hides;
DROP POLICY IF EXISTS "own hides insert" ON public.chat_message_hides;
DROP POLICY IF EXISTS "own hides delete" ON public.chat_message_hides;
CREATE POLICY "own hides read" ON public.chat_message_hides
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own hides insert" ON public.chat_message_hides
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own hides delete" ON public.chat_message_hides
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS chat_message_hides_user_idx ON public.chat_message_hides(user_id, message_id);