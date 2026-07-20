
-- Helper: para cada tabela adicionamos creator_profile_id + índice e fazemos backfill assumindo perfil 'paid'.

-- === Owner direto (creator user_id) ===

ALTER TABLE public.publications ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX publications_creator_profile_idx ON public.publications(creator_profile_id);
UPDATE public.publications p SET creator_profile_id = cp.id
  FROM public.creator_profiles cp WHERE cp.user_id = p.author_id AND cp.kind = 'paid';

ALTER TABLE public.live_sessions ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX live_sessions_creator_profile_idx ON public.live_sessions(creator_profile_id);
UPDATE public.live_sessions l SET creator_profile_id = cp.id
  FROM public.creator_profiles cp WHERE cp.user_id = l.creator_id AND cp.kind = 'paid';

ALTER TABLE public.promotions ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX promotions_creator_profile_idx ON public.promotions(creator_profile_id);
UPDATE public.promotions x SET creator_profile_id = cp.id
  FROM public.creator_profiles cp WHERE cp.user_id = x.creator_id AND cp.kind = 'paid';

ALTER TABLE public.subscriptions ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX subscriptions_creator_profile_idx ON public.subscriptions(creator_profile_id);
UPDATE public.subscriptions s SET creator_profile_id = cp.id
  FROM public.creator_profiles cp WHERE cp.user_id = s.creator_id AND cp.kind = 'paid';

ALTER TABLE public.tips ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX tips_creator_profile_idx ON public.tips(creator_profile_id);
UPDATE public.tips t SET creator_profile_id = cp.id
  FROM public.creator_profiles cp WHERE cp.user_id = t.creator_id AND cp.kind = 'paid';

ALTER TABLE public.video_calls ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX video_calls_creator_profile_idx ON public.video_calls(creator_profile_id);
UPDATE public.video_calls v SET creator_profile_id = cp.id
  FROM public.creator_profiles cp WHERE cp.user_id = v.creator_id AND cp.kind = 'paid';

ALTER TABLE public.subscriber_restrictions ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX subscriber_restrictions_creator_profile_idx ON public.subscriber_restrictions(creator_profile_id);
UPDATE public.subscriber_restrictions r SET creator_profile_id = cp.id
  FROM public.creator_profiles cp WHERE cp.user_id = r.creator_id AND cp.kind = 'paid';

ALTER TABLE public.chat_message_unlocks ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX chat_message_unlocks_creator_profile_idx ON public.chat_message_unlocks(creator_profile_id);
UPDATE public.chat_message_unlocks u SET creator_profile_id = cp.id
  FROM public.creator_profiles cp WHERE cp.user_id = u.creator_id AND cp.kind = 'paid';

ALTER TABLE public.creator_streak_days ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX creator_streak_days_creator_profile_idx ON public.creator_streak_days(creator_profile_id);
UPDATE public.creator_streak_days d SET creator_profile_id = cp.id
  FROM public.creator_profiles cp WHERE cp.user_id = d.creator_id AND cp.kind = 'paid';

ALTER TABLE public.withdrawals ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX withdrawals_creator_profile_idx ON public.withdrawals(creator_profile_id);
UPDATE public.withdrawals w SET creator_profile_id = cp.id
  FROM public.creator_profiles cp WHERE cp.user_id = w.creator_id AND cp.kind = 'paid';

ALTER TABLE public.creator_wallets ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX creator_wallets_creator_profile_idx ON public.creator_wallets(creator_profile_id);
UPDATE public.creator_wallets cw SET creator_profile_id = cp.id
  FROM public.creator_profiles cp WHERE cp.user_id = cw.user_id AND cp.kind = 'paid';

ALTER TABLE public.transactions ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE SET NULL;
CREATE INDEX transactions_creator_profile_idx ON public.transactions(creator_profile_id);
UPDATE public.transactions t SET creator_profile_id = cp.id
  FROM public.creator_profiles cp WHERE cp.user_id = t.creator_id AND cp.kind = 'paid';

ALTER TABLE public.follows ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX follows_creator_profile_idx ON public.follows(creator_profile_id);
UPDATE public.follows f SET creator_profile_id = cp.id
  FROM public.creator_profiles cp WHERE cp.user_id = f.followee_id AND cp.kind = 'paid';

-- === Derivado de publications ===

ALTER TABLE public.publication_media ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX publication_media_creator_profile_idx ON public.publication_media(creator_profile_id);
UPDATE public.publication_media m SET creator_profile_id = p.creator_profile_id
  FROM public.publications p WHERE p.id = m.publication_id;

ALTER TABLE public.publication_unlocks ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX publication_unlocks_creator_profile_idx ON public.publication_unlocks(creator_profile_id);
UPDATE public.publication_unlocks u SET creator_profile_id = p.creator_profile_id
  FROM public.publications p WHERE p.id = u.publication_id;

ALTER TABLE public.publication_bookmarks ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX publication_bookmarks_creator_profile_idx ON public.publication_bookmarks(creator_profile_id);
UPDATE public.publication_bookmarks b SET creator_profile_id = p.creator_profile_id
  FROM public.publications p WHERE p.id = b.publication_id;

ALTER TABLE public.publication_comments ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX publication_comments_creator_profile_idx ON public.publication_comments(creator_profile_id);
UPDATE public.publication_comments c SET creator_profile_id = p.creator_profile_id
  FROM public.publications p WHERE p.id = c.publication_id;

ALTER TABLE public.publication_likes ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX publication_likes_creator_profile_idx ON public.publication_likes(creator_profile_id);
UPDATE public.publication_likes l SET creator_profile_id = p.creator_profile_id
  FROM public.publications p WHERE p.id = l.publication_id;

ALTER TABLE public.publication_views ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX publication_views_creator_profile_idx ON public.publication_views(creator_profile_id);
UPDATE public.publication_views v SET creator_profile_id = p.creator_profile_id
  FROM public.publications p WHERE p.id = v.publication_id;

ALTER TABLE public.publication_comment_likes ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX publication_comment_likes_creator_profile_idx ON public.publication_comment_likes(creator_profile_id);
UPDATE public.publication_comment_likes cl SET creator_profile_id = p.creator_profile_id
  FROM public.publication_comments c
  JOIN public.publications p ON p.id = c.publication_id
  WHERE c.id = cl.comment_id;

ALTER TABLE public.publication_challenge_tiers ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX publication_challenge_tiers_creator_profile_idx ON public.publication_challenge_tiers(creator_profile_id);
UPDATE public.publication_challenge_tiers ct SET creator_profile_id = p.creator_profile_id
  FROM public.publications p WHERE p.id = ct.publication_id;

-- === Derivado de live_sessions ===

ALTER TABLE public.live_likes ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX live_likes_creator_profile_idx ON public.live_likes(creator_profile_id);
UPDATE public.live_likes ll SET creator_profile_id = l.creator_profile_id
  FROM public.live_sessions l WHERE l.id = ll.live_id;

ALTER TABLE public.live_comments ADD COLUMN creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE CASCADE;
CREATE INDEX live_comments_creator_profile_idx ON public.live_comments(creator_profile_id);
UPDATE public.live_comments lc SET creator_profile_id = l.creator_profile_id
  FROM public.live_sessions l WHERE l.id = lc.live_id;
