
CREATE TABLE public.subscriber_restrictions (
  creator_id uuid NOT NULL,
  subscriber_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (creator_id, subscriber_id),
  CHECK (creator_id <> subscriber_id)
);

CREATE INDEX idx_subscriber_restrictions_subscriber ON public.subscriber_restrictions(subscriber_id);

GRANT SELECT, INSERT, DELETE ON public.subscriber_restrictions TO authenticated;
GRANT ALL ON public.subscriber_restrictions TO service_role;

ALTER TABLE public.subscriber_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator selects own restrictions" ON public.subscriber_restrictions
  FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

CREATE POLICY "creator inserts own restrictions" ON public.subscriber_restrictions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "creator deletes own restrictions" ON public.subscriber_restrictions
  FOR DELETE TO authenticated
  USING (auth.uid() = creator_id);

CREATE OR REPLACE FUNCTION public.is_restricted(_creator uuid, _subscriber uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriber_restrictions
    WHERE creator_id = _creator AND subscriber_id = _subscriber
  );
$$;

DROP POLICY IF EXISTS "participants read messages" ON public.chat_messages;
CREATE POLICY "participants read messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = thread_id AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)
    )
    AND NOT (
      sender_id <> auth.uid()
      AND public.is_restricted(auth.uid(), sender_id)
    )
  );

DROP POLICY IF EXISTS "comments readable by authenticated" ON public.publication_comments;
CREATE POLICY "comments readable by authenticated" ON public.publication_comments
  FOR SELECT TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1
      FROM public.publications p
      JOIN public.subscriber_restrictions r
        ON r.creator_id = p.author_id
       AND r.subscriber_id = publication_comments.user_id
      WHERE p.id = publication_comments.publication_id
    )
  );
