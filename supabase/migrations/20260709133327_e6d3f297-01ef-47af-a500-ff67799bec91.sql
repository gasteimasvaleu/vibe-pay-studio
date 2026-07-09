
-- Chat threads (1-on-1 DM)
CREATE TABLE public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_threads_ordered CHECK (user_a < user_b),
  CONSTRAINT chat_threads_unique UNIQUE (user_a, user_b)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read threads" ON public.chat_threads
  FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "participants update threads" ON public.chat_threads
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b)
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

CREATE INDEX chat_threads_user_a_idx ON public.chat_threads (user_a, last_message_at DESC);
CREATE INDEX chat_threads_user_b_idx ON public.chat_threads (user_b, last_message_at DESC);

CREATE TRIGGER chat_threads_set_updated_at
  BEFORE UPDATE ON public.chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Chat messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_threads t
    WHERE t.id = thread_id AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)
  ));

CREATE POLICY "sender inserts messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = thread_id AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)
    )
  );

CREATE POLICY "recipient marks read" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (
    sender_id <> auth.uid() AND EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = thread_id AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)
    )
  )
  WITH CHECK (
    sender_id <> auth.uid() AND EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = thread_id AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)
    )
  );

CREATE INDEX chat_messages_thread_idx ON public.chat_messages (thread_id, created_at DESC);

-- RPC to get or create thread
CREATE OR REPLACE FUNCTION public.get_or_create_thread(other_user uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  a uuid;
  b uuid;
  t_id uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF other_user = me THEN
    RAISE EXCEPTION 'cannot chat with self';
  END IF;
  IF me < other_user THEN a := me; b := other_user;
  ELSE a := other_user; b := me;
  END IF;

  SELECT id INTO t_id FROM public.chat_threads WHERE user_a = a AND user_b = b;
  IF t_id IS NULL THEN
    INSERT INTO public.chat_threads (user_a, user_b) VALUES (a, b) RETURNING id INTO t_id;
  END IF;
  RETURN t_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_or_create_thread(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_thread(uuid) TO authenticated;

-- Trigger to bump last_message_at on new message
CREATE OR REPLACE FUNCTION public.bump_thread_last_message()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_threads
    SET last_message_at = NEW.created_at, updated_at = now()
    WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_messages_bump_thread
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_thread_last_message();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_threads REPLICA IDENTITY FULL;
