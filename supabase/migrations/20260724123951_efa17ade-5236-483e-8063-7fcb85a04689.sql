
-- Backfill personas across chat / monetization tables using each user's paid creator_profile as default.

-- chat_threads: side A / side B
UPDATE public.chat_threads t
   SET user_a_profile_id = public.default_paid_profile(t.user_a)
 WHERE t.user_a_profile_id IS NULL
   AND public.default_paid_profile(t.user_a) IS NOT NULL;

UPDATE public.chat_threads t
   SET user_b_profile_id = public.default_paid_profile(t.user_b)
 WHERE t.user_b_profile_id IS NULL
   AND public.default_paid_profile(t.user_b) IS NOT NULL;

-- chat_messages: sender persona
UPDATE public.chat_messages m
   SET creator_profile_id = public.default_paid_profile(m.sender_id)
 WHERE m.creator_profile_id IS NULL
   AND public.default_paid_profile(m.sender_id) IS NOT NULL;

-- chat_message_unlocks: creator persona
UPDATE public.chat_message_unlocks u
   SET creator_profile_id = public.default_paid_profile(u.creator_id)
 WHERE u.creator_profile_id IS NULL
   AND u.creator_id IS NOT NULL
   AND public.default_paid_profile(u.creator_id) IS NOT NULL;

-- chat_media_requests (Paid DM): creator persona
UPDATE public.chat_media_requests r
   SET creator_profile_id = public.default_paid_profile(r.creator_id)
 WHERE r.creator_profile_id IS NULL
   AND public.default_paid_profile(r.creator_id) IS NOT NULL;

-- video_calls: creator persona
UPDATE public.video_calls v
   SET creator_profile_id = public.default_paid_profile(v.creator_id)
 WHERE v.creator_profile_id IS NULL
   AND public.default_paid_profile(v.creator_id) IS NOT NULL;

-- tips: creator persona
UPDATE public.tips t
   SET creator_profile_id = public.default_paid_profile(t.creator_id)
 WHERE t.creator_profile_id IS NULL
   AND public.default_paid_profile(t.creator_id) IS NOT NULL;

-- broadcast_jobs: creator persona
UPDATE public.broadcast_jobs b
   SET creator_profile_id = public.default_paid_profile(b.creator_id)
 WHERE b.creator_profile_id IS NULL
   AND public.default_paid_profile(b.creator_id) IS NOT NULL;
