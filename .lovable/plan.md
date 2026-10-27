# Correção de risco de fraude na recarga da carteira

Escopo: só a recarga da carteira do fã, o estorno dela e um aviso no painel admin. Nada mais muda.

## Resultado da consulta pedida (já feita, só leitura)
Recargas feitas com cartão ou que tiveram estorno/chargeback no Asaas: **nenhuma** encontrada nos registros do app. Hoje todas as recargas aparecem como Pix, então, se você quiser certeza total, confiro também direto na API do Asaas durante a implementação e mostro o resultado.

## O que muda
1. **Recarga só por Pix**
   - `createWalletTopupPayment`: recusa qualquer forma que não seja Pix.
   - `chargeSavedCardTopUp` (recarga com cartão salvo): passa a recusar sempre com a mensagem "Recarga da carteira só por Pix".
   - Tela **Recarregar** (`mywallet.recarregar`): some a opção de cartão; fica só Pix.
   - Tela **Minha carteira** (`mywallet.index`): some o botão "recarregar com este cartão" dos cartões salvos (os cartões continuam lá para comprar conteúdo).
   - Com isso, o problema 2 (saldo pago com carteira liberado na hora ao creator) deixa de permitir transformar cartão em saque, porque a carteira só recebe Pix. A regra de liberação imediata em si não é alterada.
2. **Forma de pagamento correta**: `creditWalletTopup` grava `payment_method` conforme o `billingType` real do Asaas (PIX → pix, CREDIT_CARD → credit_card, BOLETO → boleto), lido da intenção de pagamento.
3. **Estorno e chargeback de recarga** (webhook do Asaas): quando chega reembolso, reembolso parcial ou chargeback de uma recarga:
   - a transação da recarga vira `refunded` (ou `partially_refunded`);
   - o saldo da carteira é debitado do valor estornado, uma única vez por pagamento;
   - se o saldo não cobrir, ele vai a zero, a diferença fica registrada como dívida e a carteira é bloqueada;
   - carteira bloqueada não paga nada até o admin liberar (mensagem: "Sua carteira está em revisão. Fale com o suporte.").
4. **Painel admin**: nova tela **Carteiras bloqueadas** com usuário, valor estornado, dívida, data e motivo, e um botão "Liberar carteira" (pede observação, registra no log de auditoria).

## Migration (1)
- Colunas novas em `subscriber_wallets`: `debt_cents` (padrão 0), `blocked_at`, `blocked_reason`, `reviewed_at`, `reviewed_by`.
- Função `reverse_wallet_topup(_provider_ref text, _amount_cents bigint, _event text)` (só o servidor executa): trava a carteira, evita processar o mesmo estorno duas vezes, marca a transação, debita saldo, registra a dívida e bloqueia quando necessário.
- `pay_with_wallet` passa a recusar quando a carteira está bloqueada.
- Função `admin_unblock_wallet(_user_id uuid, _note text)` que exige perfil admin.

## Arquivos que serão alterados
- `src/lib/payments-reconcile.server.ts` — forma de pagamento real.
- `src/lib/payments.functions.ts` — recarga só Pix.
- `src/lib/saved-cards.functions.ts` — recarga com cartão salvo bloqueada.
- `src/routes/api/public/webhooks/asaas.ts` — estorno/chargeback de recarga chama a função de reversão.
- `src/routes/_authenticated/mywallet.recarregar.tsx` e `mywallet.index.tsx` — sem opção de cartão.
- Novo `src/routes/_authenticated/admin.wallets.tsx` + funções admin em `src/lib/admin-wallets.functions.ts`, e link no menu do admin.

## Testes
- Recarga Pix no sandbox credita normalmente (se as chaves de sandbox estiverem configuradas).
- Simular evento PAYMENT_REFUNDED de uma recarga no webhook: saldo debitado; repetir o evento não debita de novo; com saldo menor que o estorno, carteira vai a zero, dívida aparece e o caso surge em Carteiras bloqueadas.
- Tentar pagar com carteira bloqueada: recusado.
