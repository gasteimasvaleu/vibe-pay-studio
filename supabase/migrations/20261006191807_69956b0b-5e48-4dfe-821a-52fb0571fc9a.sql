ALTER TABLE public.payout_accounts ADD COLUMN IF NOT EXISTS payout_mode text NOT NULL DEFAULT 'asaas_split';
ALTER TABLE public.payout_accounts ALTER COLUMN bank_name DROP NOT NULL;
ALTER TABLE public.payout_accounts ALTER COLUMN account_type DROP NOT NULL;
ALTER TABLE public.payout_accounts ALTER COLUMN agency DROP NOT NULL;
ALTER TABLE public.payout_accounts ALTER COLUMN account_number DROP NOT NULL;
CREATE OR REPLACE FUNCTION public.validate_payout_mode() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.payout_mode NOT IN ('asaas_split','pix') THEN RAISE EXCEPTION 'payout_mode inválido'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_validate_payout_mode ON public.payout_accounts;
CREATE TRIGGER trg_validate_payout_mode BEFORE INSERT OR UPDATE ON public.payout_accounts FOR EACH ROW EXECUTE FUNCTION public.validate_payout_mode();