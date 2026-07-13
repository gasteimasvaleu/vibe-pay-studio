# Pagamento com cartão via checkout hospedado Asaas

## Estratégia

Toda cobrança criada via `/v3/payments` já retorna um `invoiceUrl` — a página de pagamento hospedada pelo Asaas onde o cliente pode pagar com **cartão, PIX ou boleto**. Em vez de coletar dados de cartão no nosso app (PCI, tokenização, formulários), a gente **abre o `invoiceUrl` em nova aba** e o Asaas devolve o resultado via webhook (já implementado).

**Vantagens:** zero mudança de backend, zero PCI, aproveita o checkout do Asaas personalizado (aquela tela "Personalizar Checkout" do painel), suporta parcelamento em cartão, funciona com nosso split, e o webhook já atualiza tudo.

**Trade-off:** o usuário sai do app por alguns segundos (nova aba). Depois volta e vê o estado atualizado.

## Escopo

Adicionar método **`CARD_CHECKOUT`** (checkout hospedado) em paralelo ao **PIX** (fluxo nativo com QR) nos 4 fluxos de compra:
- Desbloqueio de publicação
- Tip
- Assinatura
- Desbloqueio de mensagem no chat
- Videocall

## Mudanças no backend

**`src/lib/payments.functions.ts`:**
- Adicionar `"CREDIT_CARD"` como método aceito nos validators (já está tipado).
- Quando `method === "CREDIT_CARD"`, chamar `createPayment` com `billingType: "CREDIT_CARD"` **sem** `creditCard`/`creditCardHolderInfo` — o Asaas devolve `invoiceUrl` apontando pra tela de cartão hospedada.
- Retornar `invoiceUrl` no `CheckoutResult` (já retorna).
- Remover a exigência de `card` no `buildCardArgs` — vira só fallback pro fluxo antigo que ninguém usa.

**Nenhuma migração necessária.** `payment_intents.method` já aceita string, triggers já mapeiam `credit_card` → hold de 15 dias.

## Mudanças no frontend

Nos componentes de checkout (procurar por `createUnlockPayment`, `createTipPayment`, `createSubscriptionPayment`, `createChatUnlockPayment`, `createVideoCallPayment`):

1. **Seletor de método** — dois botões: `PIX (na hora)` e `Cartão (novo)`.
2. **Fluxo PIX** — igual ao atual, mostra QR + copia-e-cola.
3. **Fluxo Cartão** — ao clicar:
   - Chama o server fn com `method: "CREDIT_CARD"`.
   - Recebe `invoiceUrl`.
   - `window.open(invoiceUrl, "_blank")` + mostra tela de "Aguardando pagamento" no app atual.
   - Faz polling no `payment_intents` ou realtime na tabela de referência (`publication_unlocks.status`, etc.) até virar `paid` → mostra sucesso e libera o conteúdo. Já temos webhook, então o status muda sozinho.

## Fluxo do webhook (já existe)

Quando o cliente termina o pagamento no checkout Asaas:
1. Asaas envia `PAYMENT_CONFIRMED` → nosso webhook.
2. Webhook atualiza `publication_unlocks.status = paid` (ou tips, subscriptions, etc.).
3. Trigger `*_sync_transaction` cria a linha em `transactions`.
4. Trigger `transactions_apply_wallet_effects` credita o criador (pending 15 dias pra cartão).
5. Frontend detecta via realtime e libera o conteúdo.

## Configuração no painel Asaas

- **Habilitar cartão de crédito** em Configurações → Meios de recebimento (pode exigir análise da conta).
- **Opcional:** personalizar o checkout (logo, cor) na tela "Personalizar Checkout" que você me mostrou — agora sim faz sentido.

## O que fica fora deste plano

- Formulário nativo de cartão dentro do app (tokenização + PCI) — não é necessário.
- Salvar cartão do usuário para renovação automática de assinatura — próximo passo depois que o fluxo de checkout hospedado estiver rodando.
- Boleto — a tela hospedada já oferece, mas se você quiser exibir opção separada no app, é só adicionar `BOLETO` no seletor de método.

## Verificação

1. Build passa (typecheck no `Method` estendido).
2. Comprar uma publicação com cartão → abre checkout Asaas em nova aba → pagar em ambiente sandbox → voltar ao app → conteúdo desbloqueado.
3. Conferir `payment_intents` com `method='CREDIT_CARD'` e `transactions.payment_method='credit_card'`.
4. Conferir `creator_wallets.pending_national_cents` cresceu (15 dias).
