# Aviso de renovação no modal de assinatura

## O que está acontecendo

O aviso "Renovação manual" no modal `Assinar` é um texto fixo: ele aparece sempre, independentemente da forma de pagamento escolhida.

Mas o comportamento real do backend é misto:

- **Cartão salvo/tokenizado** → a assinatura é criada com `auto_renew = true` e cobrança recorrente no Asaas. Renova sozinha.
- **PIX / Carteira** → a assinatura é criada com `auto_renew = false`, cobre 1 ciclo e o usuário recebe e-mail 7 dias antes do vencimento.

Ou seja, o texto está correto só para PIX e Carteira, e errado para Cartão.

## Correção proposta

Tornar o aviso dinâmico conforme a forma de pagamento selecionada no modal:

- **Cartão**: "Renovação automática. Cobramos o mesmo cartão a cada ciclo. Você pode cancelar a qualquer momento em Assinaturas."
- **PIX / Carteira**: manter o texto atual de renovação manual.

Mudança apenas visual/texto no modal — nenhuma alteração na lógica de cobrança.

## Detalhes técnicos

- Arquivo: `src/components/payments/SubscribeDialog.tsx` (bloco de aviso logo abaixo do `PaymentMethodPicker`).
- Alternar o conteúdo com base no estado `method` já existente (`CREDIT_CARD` vs `PIX`/`WALLET`).
