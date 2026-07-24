UPDATE public.chat_threads t
SET user_a_profile_id = (
  SELECT cp.id FROM public.creator_profiles cp
  WHERE cp.user_id = t.user_a AND cp.kind = 'paid'
  ORDER BY cp.created_at ASC LIMIT 1
)
WHERE t.user_a_profile_id IS NULL;

UPDATE public.chat_threads t
SET user_b_profile_id = (
  SELECT cp.id FROM public.creator_profiles cp
  WHERE cp.user_id = t.user_b AND cp.kind = 'paid'
  ORDER BY cp.created_at ASC LIMIT 1
)
WHERE t.user_b_profile_id IS NULL;

UPDATE public.chat_messages m
SET creator_profile_id = CASE
  WHEN m.sender_id = t.user_a THEN t.user_a_profile_id
  WHEN m.sender_id = t.user_b THEN t.user_b_profile_id
  ELSE m.creator_profile_id
END
FROM public.chat_threads t
WHERE m.thread_id = t.id AND m.creator_profile_id IS NULL;