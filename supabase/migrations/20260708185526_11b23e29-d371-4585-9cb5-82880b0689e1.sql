-- Normalize any existing rows to allowed values (safety)
UPDATE public.profiles
SET account_type = 'subscriber'
WHERE account_type NOT IN ('subscriber','creator');

-- Restrict to two allowed values via CHECK constraint (immutable, safe)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_type_check
  CHECK (account_type IN ('subscriber','creator'));

-- Ensure handle_new_user only writes allowed values
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
  if acct NOT IN ('subscriber','creator') then
    acct := 'subscriber';
  end if;

  insert into public.profiles (user_id, username, account_type)
  values (new.id, candidate, acct)
  on conflict (user_id) do nothing;

  return new;
end;
$function$;