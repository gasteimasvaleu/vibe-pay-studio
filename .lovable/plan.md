## Problema

`Pagar` falha com **new row violates row-level security policy for table "publication_unlocks"**.

A tabela `publication_unlocks` só tem políticas de SELECT (`unlocks_author_read`, `unlocks_buyer_read`) — não existe policy de INSERT. Como o insert em `createUnlockPayment` roda com o cliente do usuário autenticado (via `requireSupabaseAuth`), o RLS bloqueia.

## Correção

Migration adicionando policy de INSERT restrita ao comprador:

```sql
CREATE POLICY "unlocks_buyer_insert"
  ON public.publication_unlocks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);
```

O `provider_ref` é atualizado logo depois via `.update()` — também precisa de UPDATE policy pelo mesmo motivo (senão o próximo passo falha). Adicionar:

```sql
CREATE POLICY "unlocks_buyer_update"
  ON public.publication_unlocks
  FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);
```

Sem alterar as políticas de SELECT existentes nem grants.

## Arquivos alterados

- Uma migration nova adicionando as duas policies.
