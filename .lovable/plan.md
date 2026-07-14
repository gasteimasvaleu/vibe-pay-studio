## Problema

Toast: `duplicate key value violates unique constraint "publication_unlocks_publication_id_buyer_id_key"`.

Não tem a ver com o CPF do criador. A tabela `publication_unlocks` tem UNIQUE `(publication_id, buyer_id)`. Na tentativa anterior (a que falhou com "CPF obrigatório") o INSERT já havia sido feito com `status='pending'` **antes** da chamada ao Asaas. Como o Asaas falhou depois, ficou uma linha "pending" órfã. Agora, na nova tentativa, o INSERT bate no UNIQUE.

## Correção em `createUnlockPayment` (`src/lib/payments.functions.ts`)

Antes do INSERT:

1. `SELECT id, status FROM publication_unlocks WHERE publication_id = pub.id AND buyer_id = userId`.
2. Se existe e `status = 'paid'` → `throw new Error("publicação já desbloqueada")`.
3. Se existe e `status IN ('pending','failed','cancelled')` → **reaproveitar**: atualizar `amount_cents`, `provider='asaas'`, `status='pending'`, `provider_ref=null` e usar o `id` existente para o restante do fluxo.
4. Se não existe → INSERT como hoje.

O restante da função (chamada Asaas, `update provider_ref`, `recordIntent`) permanece igual, apenas usando o `unlock.id` recuperado/inserido.

Isso resolve o erro atual e evita a mesma armadilha em qualquer futura falha entre INSERT e o Asaas.

## Arquivos alterados

- `src/lib/payments.functions.ts` — bloco de INSERT em `createUnlockPayment` vira "get-or-reuse-or-insert".

Nenhuma migration é necessária; o UNIQUE continua válido.
