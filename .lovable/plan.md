## Diagnóstico

O convite de videochamada é criado com `status='pending_payment'` e `payment_status='pending'`. Após o pagamento, nada abre a sala porque três pontos estão quebrados:

1. **Webhook Asaas** (`src/routes/api/public/webhooks/asaas.ts`, `markStatus`): quando o pagamento é confirmado, só atualiza `payment_status='paid'` para `video_calls`. O `status` permanece `pending_payment`, então a chamada nunca vira "ativa".
2. **`listActiveCallsWith`** (`src/lib/communication.functions.ts`): filtra `status IN ['requested','accepted']`. Como o status nunca muda, o `VideoCallHeaderButton` não mostra o ponto verde de "entrar" e o assinante não tem como abrir a sala.
3. **`CallInviteCard`** (em `src/routes/_authenticated/chat.$threadId.tsx`): quando pago, mostra apenas "Pago · aguardando início", sem CTA para entrar na chamada.
4. **`pay_with_wallet` (SQL)** grava `status='scheduled'` no ramo `video_call`, mas esse valor **não existe** no enum `video_call_status` — pagamento com carteira falha silenciosamente/erro de enum e a linha não avança.

## Mudanças

### 1. Migração SQL
- Corrigir `pay_with_wallet` para usar `status='accepted'` (valor válido do enum) em vez de `'scheduled'` no ramo `video_call`.
- Ajustar webhook Asaas: quando `video_calls` recebe `paid`, além de `payment_status='paid'` também setar `status='accepted'` (apenas se o status atual for `pending_payment`, para não sobrescrever `cancelled/expired`).

### 2. Webhook (`src/routes/api/public/webhooks/asaas.ts`)
Na função `markStatus`, tratar `video_calls` como caso especial: quando `status='paid'`, atualizar em uma passada `payment_status='paid'` + `status='accepted'` (com `WHERE status='pending_payment'`).

### 3. UI do convite (`src/routes/_authenticated/chat.$threadId.tsx`)
No `CallInviteCard`, quando `paid`:
- Substituir o texto estático por um botão **"Entrar na chamada"** (verde) que navega para `/chat/call/$callId` — visível para ambos os lados (criador e assinante).
- Manter o rótulo "Pago" como badge acima do botão.

### 4. Verificação
Após aplicar, refazer o fluxo (criar convite → pagar via PIX → confirmar webhook) e conferir que:
- O card no chat exibe "Entrar na chamada".
- O ícone de vídeo no header ganha o ponto verde.
- Clicar abre `/chat/call/$callId` e provisiona a sala Daily via `joinVideoCall`.

## Detalhes técnicos

- `joinVideoCall` já aceita entrar quando `status != completed/cancelled/declined` e `payment_status='paid'`, então basta destravar a UI.
- Nova migração idempotente (`CREATE OR REPLACE FUNCTION pay_with_wallet(...)`) para o fix do enum, sem alterar assinatura.
