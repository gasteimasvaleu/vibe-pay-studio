
-- =========================================================
-- Onda 1: isolar dados por creator_profile ativo
-- Adiciona creator_profile_id nas tabelas que faltam,
-- adiciona pareamento de persona em chat_threads/chat_messages,
-- cria triggers de preenchimento e faz backfill do histórico
-- atribuindo tudo ao perfil "paid" (persona antiga).
-- =========================================================

-- 1) Colunas novas ------------------------------------------------
ALTER TABLE public.vault_uploads
  ADD COLUMN IF NOT EXISTS creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.vault_categories
  ADD COLUMN IF NOT EXISTS creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.vault_category_items
  ADD COLUMN IF NOT EXISTS creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.payout_accounts
  ADD COLUMN IF NOT EXISTS creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS creator_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS user_a_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_b_profile_id uuid REFERENCES public.creator_profiles(id) ON DELETE SET NULL;

-- Índices auxiliares p/ leitura por profile
CREATE INDEX IF NOT EXISTS vault_uploads_creator_profile_idx ON public.vault_uploads(creator_profile_id);
CREATE INDEX IF NOT EXISTS vault_categories_creator_profile_idx ON public.vault_categories(creator_profile_id);
CREATE INDEX IF NOT EXISTS chat_messages_creator_profile_idx ON public.chat_messages(creator_profile_id);
CREATE INDEX IF NOT EXISTS chat_threads_a_profile_idx ON public.chat_threads(user_a, user_a_profile_id);
CREATE INDEX IF NOT EXISTS chat_threads_b_profile_idx ON public.chat_threads(user_b, user_b_profile_id);

-- 2) Triggers de preenchimento -----------------------------------

CREATE OR REPLACE FUNCTION public.vault_fill_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.creator_profile_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.creator_profile_id := public.resolve_active_profile(NEW.user_id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_vault_uploads_fill_profile ON public.vault_uploads;
CREATE TRIGGER trg_vault_uploads_fill_profile
BEFORE INSERT ON public.vault_uploads
FOR EACH ROW EXECUTE FUNCTION public.vault_fill_profile();

DROP TRIGGER IF EXISTS trg_vault_categories_fill_profile ON public.vault_categories;
CREATE TRIGGER trg_vault_categories_fill_profile
BEFORE INSERT ON public.vault_categories
FOR EACH ROW EXECUTE FUNCTION public.vault_fill_profile();

CREATE OR REPLACE FUNCTION public.vault_category_items_fill_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _profile uuid;
BEGIN
  IF NEW.creator_profile_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT creator_profile_id INTO _profile
    FROM public.vault_categories WHERE id = NEW.category_id;
  NEW.creator_profile_id := _profile;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_vault_category_items_fill_profile ON public.vault_category_items;
CREATE TRIGGER trg_vault_category_items_fill_profile
BEFORE INSERT ON public.vault_category_items
FOR EACH ROW EXECUTE FUNCTION public.vault_category_items_fill_profile();

CREATE OR REPLACE FUNCTION public.payout_accounts_fill_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.creator_profile_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.creator_profile_id := public.resolve_active_profile(NEW.user_id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_payout_accounts_fill_profile ON public.payout_accounts;
CREATE TRIGGER trg_payout_accounts_fill_profile
BEFORE INSERT ON public.payout_accounts
FOR EACH ROW EXECUTE FUNCTION public.payout_accounts_fill_profile();

CREATE OR REPLACE FUNCTION public.chat_threads_fill_profiles()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_a_profile_id IS NULL AND NEW.user_a IS NOT NULL THEN
    NEW.user_a_profile_id := public.resolve_active_profile(NEW.user_a);
  END IF;
  IF NEW.user_b_profile_id IS NULL AND NEW.user_b IS NOT NULL THEN
    NEW.user_b_profile_id := public.resolve_active_profile(NEW.user_b);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_chat_threads_fill_profiles ON public.chat_threads;
CREATE TRIGGER trg_chat_threads_fill_profiles
BEFORE INSERT ON public.chat_threads
FOR EACH ROW EXECUTE FUNCTION public.chat_threads_fill_profiles();

CREATE OR REPLACE FUNCTION public.chat_messages_fill_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _thread RECORD;
BEGIN
  IF NEW.creator_profile_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT user_a, user_b, user_a_profile_id, user_b_profile_id
    INTO _thread FROM public.chat_threads WHERE id = NEW.thread_id;
  IF _thread.user_a = NEW.sender_id THEN
    NEW.creator_profile_id := _thread.user_a_profile_id;
  ELSIF _thread.user_b = NEW.sender_id THEN
    NEW.creator_profile_id := _thread.user_b_profile_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_chat_messages_fill_profile ON public.chat_messages;
CREATE TRIGGER trg_chat_messages_fill_profile
BEFORE INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.chat_messages_fill_profile();

-- 3) Backfill do histórico ---------------------------------------
-- Tudo que estiver NULL vai para o perfil pago do dono.

UPDATE public.vault_uploads
  SET creator_profile_id = public.default_paid_profile(user_id)
  WHERE creator_profile_id IS NULL;

UPDATE public.vault_categories
  SET creator_profile_id = public.default_paid_profile(user_id)
  WHERE creator_profile_id IS NULL;

UPDATE public.vault_category_items vci
  SET creator_profile_id = vc.creator_profile_id
  FROM public.vault_categories vc
  WHERE vci.category_id = vc.id AND vci.creator_profile_id IS NULL;

UPDATE public.payout_accounts
  SET creator_profile_id = public.default_paid_profile(user_id)
  WHERE creator_profile_id IS NULL;

UPDATE public.chat_threads
  SET user_a_profile_id = public.default_paid_profile(user_a)
  WHERE user_a_profile_id IS NULL;

UPDATE public.chat_threads
  SET user_b_profile_id = public.default_paid_profile(user_b)
  WHERE user_b_profile_id IS NULL;

UPDATE public.chat_messages cm
  SET creator_profile_id = CASE
    WHEN t.user_a = cm.sender_id THEN t.user_a_profile_id
    WHEN t.user_b = cm.sender_id THEN t.user_b_profile_id
    ELSE NULL END
  FROM public.chat_threads t
  WHERE cm.thread_id = t.id AND cm.creator_profile_id IS NULL;

-- Tabelas que já tinham a coluna mas com histórico nulo
UPDATE public.creator_wallets
  SET creator_profile_id = public.default_paid_profile(user_id)
  WHERE creator_profile_id IS NULL;

UPDATE public.withdrawals
  SET creator_profile_id = public.default_paid_profile(creator_id)
  WHERE creator_profile_id IS NULL;

UPDATE public.promotions
  SET creator_profile_id = public.default_paid_profile(creator_id)
  WHERE creator_profile_id IS NULL;

UPDATE public.chat_media_requests
  SET creator_profile_id = public.default_paid_profile(creator_id)
  WHERE creator_profile_id IS NULL;

UPDATE public.broadcast_jobs
  SET creator_profile_id = public.default_paid_profile(creator_id)
  WHERE creator_profile_id IS NULL;

UPDATE public.video_calls
  SET creator_profile_id = public.default_paid_profile(creator_id)
  WHERE creator_profile_id IS NULL;

UPDATE public.creator_streak_days
  SET creator_profile_id = public.default_paid_profile(creator_id)
  WHERE creator_profile_id IS NULL;

UPDATE public.publications
  SET creator_profile_id = public.default_paid_profile(author_id)
  WHERE creator_profile_id IS NULL AND author_id IS NOT NULL;

UPDATE public.transactions
  SET creator_profile_id = public.default_paid_profile(creator_id)
  WHERE creator_profile_id IS NULL AND creator_id IS NOT NULL;

UPDATE public.publication_unlocks
  SET creator_profile_id = public.default_paid_profile(
    (SELECT author_id FROM public.publications WHERE id = publication_unlocks.publication_id)
  )
  WHERE creator_profile_id IS NULL;

UPDATE public.chat_message_unlocks
  SET creator_profile_id = public.default_paid_profile(creator_id)
  WHERE creator_profile_id IS NULL AND creator_id IS NOT NULL;

UPDATE public.tips
  SET creator_profile_id = public.default_paid_profile(creator_id)
  WHERE creator_profile_id IS NULL AND creator_id IS NOT NULL;

UPDATE public.subscriptions
  SET creator_profile_id = public.default_paid_profile(creator_id)
  WHERE creator_profile_id IS NULL AND creator_id IS NOT NULL;

UPDATE public.story_unlocks
  SET creator_profile_id = public.default_paid_profile(creator_id)
  WHERE creator_profile_id IS NULL AND creator_id IS NOT NULL;
