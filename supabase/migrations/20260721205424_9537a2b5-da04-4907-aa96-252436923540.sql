-- Drop the old PK that mixed paid+free follows into a single row.
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_pkey;

-- Ensure creator_profile_id is present as a proper column (already exists per audit).
-- Backfill NULLs to the paid profile of the followee when possible.
UPDATE public.follows f
SET creator_profile_id = cp.id
FROM public.creator_profiles cp
WHERE f.creator_profile_id IS NULL
  AND cp.user_id = f.followee_id
  AND cp.kind = 'paid';

-- Require creator_profile_id going forward.
ALTER TABLE public.follows ALTER COLUMN creator_profile_id SET NOT NULL;

-- New PK: one follow row per (follower, creator_profile).
ALTER TABLE public.follows ADD PRIMARY KEY (follower_id, creator_profile_id);

-- Retain a supporting index for reverse lookups.
CREATE INDEX IF NOT EXISTS follows_followee_idx ON public.follows (followee_id);
