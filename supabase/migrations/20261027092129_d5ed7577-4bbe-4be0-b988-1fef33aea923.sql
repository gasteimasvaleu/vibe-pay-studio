CREATE OR REPLACE FUNCTION public.creator_profiles_protect_columns() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_kyc text;
BEGIN
  IF public.is_privileged_writer() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT kyc_status INTO owner_kyc FROM public.profiles WHERE user_id = NEW.user_id;
    IF NEW.verified_at IS NOT NULL OR (NEW.kyc_status IS NOT NULL AND NEW.kyc_status NOT IN ('not_started','pending') AND NEW.kyc_status IS DISTINCT FROM owner_kyc) THEN
      RAISE EXCEPTION 'protected_creator_fields' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.verified_at IS DISTINCT FROM OLD.verified_at OR NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    RAISE EXCEPTION 'protected_creator_fields' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.profiles_protect_columns() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_privileged_writer() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.kyc_status IS DISTINCT FROM 'not_started' OR NEW.kyc_verified_at IS NOT NULL
      OR NEW.banned_at IS NOT NULL OR NEW.account_type NOT IN ('subscriber','free_creator')
      OR NEW.cpf IS NOT NULL OR NEW.country IS NOT NULL OR NEW.referred_by IS NOT NULL
      OR NEW.asaas_customer_id IS NOT NULL OR NEW.asaas_wallet_id IS NOT NULL
      OR NEW.asaas_account_id IS NOT NULL OR NEW.asaas_api_key_encrypted IS NOT NULL
      OR NEW.veriff_session_id IS NOT NULL THEN
      RAISE EXCEPTION 'protected_profile_fields' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status OR NEW.kyc_verified_at IS DISTINCT FROM OLD.kyc_verified_at
      OR NEW.banned_at IS DISTINCT FROM OLD.banned_at OR NEW.account_type IS DISTINCT FROM OLD.account_type
      OR NEW.cpf IS DISTINCT FROM OLD.cpf OR NEW.country IS DISTINCT FROM OLD.country
      OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
      OR NEW.asaas_customer_id IS DISTINCT FROM OLD.asaas_customer_id
      OR NEW.asaas_wallet_id IS DISTINCT FROM OLD.asaas_wallet_id
      OR NEW.asaas_account_id IS DISTINCT FROM OLD.asaas_account_id
      OR NEW.asaas_api_key_encrypted IS DISTINCT FROM OLD.asaas_api_key_encrypted
      OR NEW.veriff_session_id IS DISTINCT FROM OLD.veriff_session_id THEN
      RAISE EXCEPTION 'protected_profile_fields' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.profiles_protect_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.creator_profiles_protect_columns() FROM PUBLIC, anon, authenticated;