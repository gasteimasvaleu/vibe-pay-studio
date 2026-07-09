
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS tiktok_handle text,
  ADD COLUMN IF NOT EXISTS x_handle text,
  ADD COLUMN IF NOT EXISTS price_monthly numeric(10,2),
  ADD COLUMN IF NOT EXISTS discount_quarterly int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_semiannual int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS stripe_verification_session_id text,
  ADD COLUMN IF NOT EXISTS kyc_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_price_monthly_check,
  ADD CONSTRAINT profiles_price_monthly_check
    CHECK (price_monthly IS NULL OR (price_monthly >= 19.90 AND price_monthly <= 200));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_discount_quarterly_check,
  ADD CONSTRAINT profiles_discount_quarterly_check
    CHECK (discount_quarterly >= 0 AND discount_quarterly <= 90);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_discount_semiannual_check,
  ADD CONSTRAINT profiles_discount_semiannual_check
    CHECK (discount_semiannual >= 0 AND discount_semiannual <= 90);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_kyc_status_check,
  ADD CONSTRAINT profiles_kyc_status_check
    CHECK (kyc_status IN ('not_started','processing','verified','requires_input','canceled'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_handle_format_check,
  ADD CONSTRAINT profiles_handle_format_check CHECK (
    (instagram_handle IS NULL OR instagram_handle ~ '^[A-Za-z0-9._]{1,30}$')
    AND (tiktok_handle IS NULL OR tiktok_handle ~ '^[A-Za-z0-9._]{1,30}$')
    AND (x_handle IS NULL OR x_handle ~ '^[A-Za-z0-9._]{1,30}$')
  );
