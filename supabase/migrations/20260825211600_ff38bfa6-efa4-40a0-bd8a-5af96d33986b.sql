CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  base text;
  candidate text;
  acct text;
begin
  base := coalesce(
    nullif(new.raw_user_meta_data->>'username', ''),
    nullif(new.raw_user_meta_data->>'user_name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'usuario'
  );

  -- remove acentos; a normalização final (minúsculas, caracteres válidos,
  -- tamanho e checagem de disponibilidade) é feita por resolve_available_username
  base := translate(
    base,
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
  );

  candidate := public.resolve_available_username(base);

  acct := coalesce(new.raw_user_meta_data->>'account_type', 'subscriber');
  if acct NOT IN ('subscriber','creator','free_creator') then
    acct := 'subscriber';
  end if;

  insert into public.profiles (user_id, username, account_type)
  values (new.id, candidate, acct)
  on conflict (user_id) do nothing;

  return new;
end;
$$;