DROP POLICY IF EXISTS publications_authenticated_read ON storage.objects;
DROP POLICY IF EXISTS stories_read_authenticated ON storage.objects;

CREATE POLICY publications_owner_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'publications' AND (storage.foldername(name))[2] = (auth.uid())::text);
CREATE POLICY publications_admin_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'publications' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY stories_owner_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'stories' AND (storage.foldername(name))[1] = (auth.uid())::text);
CREATE POLICY stories_admin_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'stories' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS paid_uploads_select_participants ON storage.objects;
CREATE POLICY paid_uploads_select_participants ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-paid-uploads' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.chat_media_requests r
      WHERE r.id::text = split_part(objects.name, '/', 1)
        AND (r.creator_id = auth.uid()
             OR (r.requester_id = auth.uid() AND r.paid_at IS NOT NULL))
    )
  )
);

UPDATE public.publication_media SET url = storage_path
WHERE storage_path IS NOT NULL AND url IS DISTINCT FROM storage_path;
UPDATE public.vault_uploads SET url = storage_path
WHERE storage_path IS NOT NULL AND url IS DISTINCT FROM storage_path;
UPDATE public.publications SET audio_url = audio_storage_path
WHERE audio_url IS NOT NULL AND audio_storage_path IS NOT NULL AND audio_url IS DISTINCT FROM audio_storage_path;
UPDATE public.publications SET preview_url = preview_storage_path
WHERE preview_url IS NOT NULL AND preview_storage_path IS NOT NULL AND preview_url IS DISTINCT FROM preview_storage_path;