CREATE OR REPLACE FUNCTION public.admin_unblock_wallet(_user_id uuid, _note text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE subscriber_wallets SET blocked_at = NULL, reviewed_at = now(), reviewed_by = auth.uid(),
    blocked_reason = coalesce(blocked_reason,'') || ' | liberado: ' || coalesce(_note,''), updated_at = now()
   WHERE user_id = _user_id;
  INSERT INTO audit_logs(actor_id, action, target_table, target_id, metadata)
   VALUES (auth.uid(), 'wallet.unblocked', 'subscriber_wallets', _user_id, jsonb_build_object('note', _note));
END $function$;