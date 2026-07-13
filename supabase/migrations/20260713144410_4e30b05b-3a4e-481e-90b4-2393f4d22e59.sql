ALTER TYPE public.transaction_status ADD VALUE IF NOT EXISTS 'authorized';
ALTER TYPE public.transaction_status ADD VALUE IF NOT EXISTS 'in_analysis';
ALTER TYPE public.transaction_status ADD VALUE IF NOT EXISTS 'partially_refunded';