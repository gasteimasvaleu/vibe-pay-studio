
-- 1) Allow 'free_creator' in profiles.account_type
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_type_check
  CHECK (account_type = ANY (ARRAY['subscriber'::text, 'creator'::text, 'free_creator'::text]));

-- 2) Add optional public-profile fields (safe if already added)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS cover_url text;

-- 3) Update handle_new_user to accept the third value
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  base text;
  candidate text;
  suffix int := 0;
  acct text;
begin
  base := lower(regexp_replace(
    coalesce(
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'user_name',
      split_part(new.email, '@', 1),
      'user'
    ),
    '[^a-z0-9_]', '_', 'g'
  ));
  base := substring(base from 1 for 20);
  if length(base) < 3 then base := 'user'; end if;

  candidate := base || '_' || substring(new.id::text, 1, 8);

  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := base || '_' || substring(new.id::text, 1, 8) || suffix::text;
  end loop;

  acct := coalesce(new.raw_user_meta_data->>'account_type', 'subscriber');
  if acct NOT IN ('subscriber','creator','free_creator') then
    acct := 'subscriber';
  end if;

  insert into public.profiles (user_id, username, account_type)
  values (new.id, candidate, acct)
  on conflict (user_id) do nothing;

  return new;
end;
$function$;
