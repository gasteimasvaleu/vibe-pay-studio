
-- Restringe a função de checagem de acesso: só serve para gate interno em RLS.
REVOKE EXECUTE ON FUNCTION public.can_see_publication(uuid) FROM PUBLIC, anon, authenticated;

-- Corrige search_path das funções existentes sinalizadas pelo linter.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
begin new.updated_at = now(); return new; end;
$$;
