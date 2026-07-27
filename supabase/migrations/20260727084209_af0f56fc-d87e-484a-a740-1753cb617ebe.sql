CREATE POLICY "creator creates video call invite"
ON public.video_calls
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = creator_id);