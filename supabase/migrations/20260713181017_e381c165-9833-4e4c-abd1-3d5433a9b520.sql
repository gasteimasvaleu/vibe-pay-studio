ALTER TABLE public.publications
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS audio_storage_path text;