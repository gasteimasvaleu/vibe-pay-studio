ALTER TABLE public.publications DROP CONSTRAINT publications_visibility_check;
ALTER TABLE public.publications ADD CONSTRAINT publications_visibility_check CHECK (visibility = ANY (ARRAY['public','paid','challenge','subscribers']));

CREATE OR REPLACE FUNCTION public.can_see_publication(_publication_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.publications p
    WHERE p.id = _publication_id
      AND (
        p.author_id = auth.uid()
        OR public.has_role(auth.uid(),'admin')
        OR public.has_role(auth.uid(),'moderator')
        OR (
          p.moderation_status = 'approved'
          AND (
            p.visibility = 'public'
            OR EXISTS (
              SELECT 1 FROM public.publication_unlocks u
              WHERE u.publication_id = p.id AND u.buyer_id = auth.uid() AND u.status = 'paid'
            )
            OR (
              p.visibility = 'subscribers'
              AND EXISTS (
                SELECT 1 FROM public.subscriptions s
                WHERE s.subscriber_id = auth.uid()
                  AND s.creator_id = p.author_id
                  AND s.status = 'active'
                  AND s.current_period_end > now()
                  AND (p.creator_profile_id IS NULL OR s.creator_profile_id IS NULL OR s.creator_profile_id = p.creator_profile_id)
              )
            )
          )
        )
      )
  );
$function$;