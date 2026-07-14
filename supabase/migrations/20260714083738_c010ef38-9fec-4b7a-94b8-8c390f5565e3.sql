CREATE POLICY "unlocks_buyer_insert"
  ON public.publication_unlocks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "unlocks_buyer_update"
  ON public.publication_unlocks
  FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);