# Saque não descontado do saldo

## O que aconteceu

O saque de R$ 166,97 foi criado e pago pela Asaas (transferência confirmada, status `paid` no app), mas o saldo "Liberado para saque" continuou mostrando R$ 166,97.

Causa confirmada: o registro do saque foi gravado **sem o vínculo com o perfil ativo** do criador. O cálculo do saldo só considera saques vinculados a esse perfil, então esse saque simplesmente não entrou na conta. O saque anterior (R$ 62,00) tinha o vínculo preenchido e por isso foi descontado normalmente.

## Correção

1. Ao solicitar um saque, gravar sempre o perfil ativo no registro — assim o valor é reservado/descontado do saldo imediatamente.
2. Rede de segurança no banco: preencher o perfil ativo automaticamente caso o registro chegue sem ele.
3. Corrigir o saque de R$ 166,97 já existente, vinculando-o ao perfil correto. O saldo "Liberado para saque" passa a mostrar R$ 0,00, refletindo a transferência já feita.

## Detalhes técnicos

- `src/lib/payouts.functions.ts` → `requestWithdrawal`: resolver `creator_profile_id` via `getActiveProfileIdFor(supabase, userId)` e incluir no `insert` em `withdrawals`. Mesmo ajuste na checagem de saldo disponível (hoje somada por `creator_id`, passar a usar o perfil ativo para ficar coerente com `computeProfileWallet`).
- Migração: trigger `BEFORE INSERT` em `public.withdrawals` que preenche `creator_profile_id` a partir de `profiles.active_profile_id` (fallback para o `creator_profiles` pago) quando vier nulo.
- Correção de dados (UPDATE pontual): setar `creator_profile_id` do saque `d270d7ea-74c4-4bff-9e15-5686b8f1dc9a` para o perfil ativo do criador `ef28932d-…`.
- Nenhuma alteração no fluxo de transferência Asaas nem no dinheiro real; apenas contabilidade interna.
