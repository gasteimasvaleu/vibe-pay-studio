
## 1. Cards do dashboard com dados reais

Hoje `EarningsSummary` mostra "R$ -" estático. Já existe o server function `getCreatorEarningsSummary` em `src/lib/finance.functions.ts` que retorna faturamento de hoje, liberado e total.

**Mudanças:**
- `src/components/dashboard/EarningsSummary.tsx`: consumir `getCreatorEarningsSummary` via `useServerFn` + `useQuery` (`queryKey: ["creator-earnings-summary"]`, `staleTime: 30s`). Formatar em BRL (`Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`). Mostrar skeleton enquanto carrega e "R$ 0,00" quando não houver dados. Manter os 3 cards: Faturamento (hoje), Liberado (disponível para saque), Total (liberado + a liberar).

## 2. Regras de liberação de ganhos do creator

O trigger `transactions_apply_wallet_effects` **já** define `released_at` no momento em que a transação vira `paid`, e credita no bucket certo:

| Meio | Prazo | Bucket inicial |
|---|---|---|
| Pix | imediato | `released_cents` |
| Wallet (saldo pré-pago) | imediato | `released_cents` |
| Cartão de crédito | D+15 | `pending_national_cents` |
| Boleto | D+2 | `pending_national_cents` |
| Internacional (qualquer meio) | D+15 | `pending_international_cents` |
| Manual | imediato | `released_cents` |

**O que falta:** nada move `pending_*` → `released_cents` quando `released_at` chega. Sem isso, cartão nunca libera.

**Solução (migration + cron):**

1. Nova migration adiciona coluna `wallet_released_at TIMESTAMPTZ` em `transactions` (marca quando o valor foi movido do pending para o liberado, evita dupla contagem).
2. Nova função `public.release_matured_earnings()` (SECURITY DEFINER, search_path=public) que:
   - Seleciona transactions com `status='paid'`, `net_cents>0`, `kind NOT IN ('withdrawal','refund','wallet_topup','wallet_bonus')`, `released_at <= now()`, `wallet_released_at IS NULL`.
   - Para cada uma: `UPDATE creator_wallets SET released_cents = released_cents + net_cents, pending_national_cents = pending_national_cents - (case when NOT is_international then net_cents else 0 end), pending_international_cents = ... - (case when is_international then net_cents else 0 end)` e `UPDATE transactions SET wallet_released_at = now()`.
   - Faz tudo em um único CTE/loop atômico por linha.
3. Agendar via `pg_cron` (rodando a cada 10 min) com `supabase--insert` (contém URL/chave do projeto, não vai para migration):
   ```sql
   select cron.schedule('release-matured-earnings','*/10 * * * *', $$ select public.release_matured_earnings(); $$);
   ```
   Habilitar `pg_cron` antes na migration (`create extension if not exists pg_cron;`).
4. Backfill único (também via `supabase--insert`): rodar `select public.release_matured_earnings();` uma vez para regularizar transações antigas cujo `released_at` já passou.

### Tratamento de estorno
O trigger já debita `released_cents` em refund/cancel/fail. Vamos ajustar o mesmo bloco para: se `wallet_released_at IS NULL` (ainda pendente), debitar do bucket `pending_national_cents`/`pending_international_cents` em vez de `released_cents`. Isso evita zerar liberado quando o estorno acontece antes do prazo.

## Escopo fora
- Não mexer no fluxo de saques (`withdrawals`) — continua consumindo `released_cents` como já faz.
- Não mexer no visual das outras páginas.

## Verificação
- `bun run build:dev` após código.
- Rodar a função manualmente uma vez e conferir que `creator_wallets` reflete o esperado.
