## Problema

A página `/follow` filtra apenas `status = 'active'`, mas seu único assinante está com `status = 'cancelled'` — embora ainda tenha acesso vigente (`current_period_end = 14/08/2026`, hoje 17/07/2026). Por isso a lista aparece vazia.

Na plataforma, "cancelado" só significa que não vai renovar; enquanto o período pago não termina, o usuário continua sendo um assinante ativo do criador.

## Mudança

**`src/lib/monetization.functions.ts` → `listMySubscribers()`**

Trocar o filtro:
- De: `.eq("status", "active")`
- Para: `.in("status", ["active", "cancelled"]).gt("current_period_end", new Date().toISOString())`

Assim entram assinantes ativos + cancelados que ainda têm acesso pago vigente. Ordenação e enriquecimento com `profiles` permanecem iguais.

Nenhuma mudança de UI, schema ou migration.
