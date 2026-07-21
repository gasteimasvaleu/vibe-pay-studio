-- Remove creator_referrals email preference and template
ALTER TABLE public.email_preferences DROP COLUMN IF EXISTS creator_referrals;

DELETE FROM public.email_templates WHERE kind = 'creator_referrals';

CREATE OR REPLACE FUNCTION public.can_send_email(_user_id uuid, _kind text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _enabled boolean;
  _allowed boolean;
BEGIN
  SELECT emails_enabled INTO _enabled FROM public.profiles WHERE user_id = _user_id;
  IF _enabled IS NULL OR _enabled = false THEN
    RETURN false;
  END IF;

  SELECT CASE _kind
    WHEN 'free_to_paid' THEN free_to_paid
    WHEN 'post_sales' THEN post_sales
    WHEN 'subscription_sales' THEN subscription_sales
    WHEN 'content_purchase' THEN content_purchase
    ELSE true
  END INTO _allowed
  FROM public.email_preferences WHERE user_id = _user_id;

  RETURN COALESCE(_allowed, true);
END;
$function$;