DROP POLICY "creator requests own withdrawal" ON public.withdrawals;

CREATE POLICY "creator requests own withdrawal"
ON public.withdrawals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = creator_id
  AND status = 'requested'
  AND provider IN ('manual', 'asaas')
);