CREATE UNIQUE INDEX IF NOT EXISTS profiles_asaas_customer_id_unique ON public.profiles(asaas_customer_id) WHERE asaas_customer_id IS NOT NULL;

CREATE TABLE public.card_tokenize_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.card_tokenize_attempts TO service_role;
ALTER TABLE public.card_tokenize_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX card_tokenize_attempts_user_idx ON public.card_tokenize_attempts(user_id, created_at);
CREATE INDEX card_tokenize_attempts_ip_idx ON public.card_tokenize_attempts(ip, created_at);

CREATE OR REPLACE FUNCTION public.check_card_tokenize_rate(_user_id uuid, _ip text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u int; _i int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('card_tok:' || _user_id::text));
  DELETE FROM card_tokenize_attempts WHERE created_at < now() - interval '1 day';
  SELECT count(*) INTO _u FROM card_tokenize_attempts WHERE user_id = _user_id AND created_at > now() - interval '1 hour';
  IF _ip IS NOT NULL THEN
    SELECT count(*) INTO _i FROM card_tokenize_attempts WHERE ip = _ip AND created_at > now() - interval '1 hour';
  ELSE _i := 0; END IF;
  IF _u >= 5 OR _i >= 5 THEN RETURN false; END IF;
  INSERT INTO card_tokenize_attempts(user_id, ip) VALUES (_user_id, _ip);
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.check_card_tokenize_rate(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_card_tokenize_rate(uuid, text) TO service_role;