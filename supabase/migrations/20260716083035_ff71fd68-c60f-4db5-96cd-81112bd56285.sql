
CREATE POLICY "Users can view own covers"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own covers"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own covers"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
