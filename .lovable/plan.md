## Problema

Toda cobrança com **cartão** (salvo OU novo) já funciona ponta-a-ponta: Asaas recebe, cobra e o webhook libera o conteúdo. O único gap é de UX: quando o Asaas retorna o pagamento como `PENDING` (em vez de `CONFIRMED` sincronamente), o frontend fecha o modal sem indicar que a confirmação ainda está sendo processada, e o desbloqueio só aparece após reload manual.

Verificado: `getPaymentIntentStatus` já existe em `src/lib/payments.functions.ts` e força reconciliação com o Asaas quando o intent está `pending` — o `PixCheckout` já usa esse polling. Basta aplicar o mesmo comportamento no caminho "cartão sem confirmação síncrona".

## Escopo

**Vale para tudo que é pago com cartão** (salvo ou novo, todos os tipos):

- Desbloqueio de publicação (feed, perfil)
- Desbloqueio de story
- Desbloqueio de chat / PPV de mídia no chat
- Gorjeta (tip)
- Assinatura
- Ticket de live
- Videochamada 1:1
- Recarga de carteira

Onde o pagamento passa pelo `PaymentModal` (feed/perfil/chat) ou por diálogos dedicados (`SubscribeDialog`, `TipDialog`, `LiveTicketDialog`, `StoryViewer`, `ChallengeContributeSheet`, videochamada, recarga), garantimos o mesmo tratamento.

## Solução

### 1. Novo componente `CardProcessingStep`
`src/components/payments/CardProcessingStep.tsx`:

- Props: `paymentIntentId`, `onPaid`, `onCancel`, `title?`
- Faz polling de `getPaymentIntentStatus` a cada 2s (mesmo padrão do `CardCheckout`)
- UI: spinner + "Confirmando pagamento com o banco… isso pode levar alguns segundos"
- Ao detectar `paid`: chama `onPaid()` (que dispara `invalidateQueries` + toast + fecha)
- Após ~60s sem confirmação: mostra "Está demorando mais que o normal. Pode fechar — assim que confirmar, o conteúdo aparece." + botão fechar
- Sem link externo (é 1‑click, não há `invoiceUrl`)

### 2. `PaymentModal` renderiza o novo step
Em `src/components/payments/PaymentModal.tsx`:

- Quando `checkout.method === "CREDIT_CARD"` e **não** houver `invoiceUrl`, renderizar `CardProcessingStep` em vez do bloco "Preparando pagamento..."
- Mantém `CardCheckout` (com `invoiceUrl`) e `PixCheckout` inalterados

### 3. Ajustar handlers para abrir o modal quando `paidImmediately=false` no cartão
Nos `confirmPayment`/`submit` que hoje só abrem o `PaymentModal` para PIX ou cartão com `invoiceUrl`, garantir que também abrem para cartão 1‑click sem confirmação síncrona (setando `checkout` com `method:"CREDIT_CARD"` e sem `invoiceUrl`):

- `src/routes/_authenticated/feed.tsx` (fluxo já monta checkout — validar)
- `src/routes/_authenticated/perfil.$username.tsx`
- `src/routes/_authenticated/chat.$threadId.tsx`
- `src/components/feed/StoryViewer.tsx`
- `src/components/payments/TipDialog.tsx`
- `src/components/payments/SubscribeDialog.tsx`
- `src/components/live/LiveTicketDialog.tsx`
- `src/components/payments/ChallengeContributeSheet.tsx`
- Videochamada e recarga de carteira

Em cada `onPaid` do step: `invalidateQueries` das keys relevantes daquela tela (`feed`, `profile-feed`, `story-*`, `chat-thread`, `subscriptions`, `subscriber-wallet`, `live-*`, etc.) + toast de sucesso + fecha.

### 4. Mensagens
- Ao abrir o step: toast leve "Pagamento em processamento…" (opcional; evita duplicar com o texto do modal)
- Ao confirmar: toast atual de sucesso do fluxo (ex.: "Publicação desbloqueada!")

## Detalhes técnicos

- Polling: `setInterval(2000)` com `clearInterval` no unmount; timeout duro em 90s.
- Reutiliza `getPaymentIntentStatus` (server fn já existente) — sem mudança de schema, sem mudança no webhook Asaas.
- Não altera `NewCardCheckoutStep`, `CardCheckout`, `PixCheckout` nem a lógica de tokenização.

## Fora de escopo

- Redesenho dos modais de checkout
- Alterações no webhook Asaas / no `applyPaidIntent`
- Alterações nos server functions de pagamento
