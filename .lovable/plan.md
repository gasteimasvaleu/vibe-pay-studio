## Problema
A INSERT policy da tabela `withdrawals` só permite `provider = 'manual'`, mas o fluxo de saque automático via Asaas insere `provider = 'asaas'`. Resultado: `new row violates row-level security policy for table "withdrawals"`.

Policy atual (WITH CHECK):
```
auth.uid() = creator_id AND status = 'requested' AND provider = 'manual'
```

## Correção
Migração para substituir a policy, permitindo tanto `manual` quanto `asaas` no insert do próprio creator:

```sql
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
```

Sem mudanças em SELECT/UPDATE (update do status pós-transferência roda pelo mesmo client autenticado e não é bloqueado — não há policy de UPDATE explícita, mas o server usa a mesma sessão; se aparecer bloqueio em UPDATE, tratamos numa iteração seguinte).

## Fora de escopo
- Mudar o mínimo (R$ 50) ou taxas.
- Alterar a UI do `SacarDialog` — o erro é puramente de RLS.
